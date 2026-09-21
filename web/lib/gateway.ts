/**
 * Server-only client for the AVOCO Gateway API (../backend-api).
 * The API key never leaves the server: browsers talk to this app's own /api routes,
 * which check the signed-in user and then call the gateway.
 */
import "server-only";

export type Zone = "leading" | "active" | "background";
export interface PsytypeResult { key: string; label: string; value: number; zone: Zone }
export interface EmostateResult { key: string; label: string; value: number }

export interface Analysis {
  id: string;
  status: "processing" | "completed" | "failed";
  type: "both" | "psytype" | "emostate";
  external_user_id: string | null;
  created_at: string;
  completed_at: string | null;
  psytype: PsytypeResult[] | null;
  emostate: EmostateResult[] | null;
  error: string | null;
}

export class GatewayError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "GatewayError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { GATEWAY_URL, GATEWAY_API_KEY } = process.env;
  if (!GATEWAY_URL || !GATEWAY_API_KEY) throw new GatewayError(500, "server_misconfigured", "Gateway is not configured");

  const res = await fetch(GATEWAY_URL.replace(/\/$/, "") + path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${GATEWAY_API_KEY}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GatewayError(res.status, body.error ?? "gateway_error", body.message ?? "Gateway request failed");
  return body as T;
}

export const gateway = {
  /** Server-to-server: stores a small audio file (up to 4 MB) in the gateway's Blob store and returns its URL. */
  async storeAudio(file: File): Promise<string> {
    const { GATEWAY_URL, GATEWAY_API_KEY } = process.env;
    if (!GATEWAY_URL || !GATEWAY_API_KEY) throw new GatewayError(500, "server_misconfigured", "Gateway is not configured");
    const form = new FormData();
    form.append("file", file, file.name || "audio.wav");
    const res = await fetch(GATEWAY_URL.replace(/\/$/, "") + "/api/v1/audio", { method: "POST", headers: { Authorization: `Bearer ${GATEWAY_API_KEY}` }, body: form, signal: AbortSignal.timeout(60_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new GatewayError(res.status, body.error ?? "gateway_error", body.message ?? "Gateway request failed");
    return body.url as string;
  },

  /** Forwards a Vercel Blob client-upload token request. */
  uploadToken: (body: unknown) => call<unknown>("/api/v1/uploads", { method: "POST", body: JSON.stringify(body) }),

  /**
   * `owner` is what the analysis is filed under in the gateway: a person's Clerk user id for their own
   * recordings, or "g:<groupId>" for a company group, so a whole group comes back in one list call.
   */
  createAnalysis: (input: { audioUrl: string; owner: string }) =>
    call<{ id: string; status: string }>("/api/v1/analyses", {
      method: "POST",
      body: JSON.stringify({ audio_url: input.audioUrl, type: "both", mode: "async", external_user_id: input.owner, consent: true }),
    }),

  /** Every analysis filed under an owner, newest first (up to 500). */
  async listAllFor(owner: string): Promise<Analysis[]> {
    const all: Analysis[] = [];
    let cursor: string | null = null;
    do {
      const page: { data: Analysis[]; next_cursor: string | null } = await call(
        `/api/v1/analyses?external_user_id=${encodeURIComponent(owner)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      all.push(...page.data);
      cursor = page.next_cursor;
    } while (cursor && all.length < 500);
    return all;
  },

  /** No ownership check: callers must have established access themselves (see lib/workspaces.ts). */
  async getAnalysis(id: string): Promise<Analysis | null> {
    try {
      return await call<Analysis>(`/api/v1/analyses/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof GatewayError && err.status === 404) return null;
      throw err;
    }
  },

  listAnalyses: (userId: string, cursor?: string) =>
    call<{ data: Analysis[]; next_cursor: string | null }>(
      `/api/v1/analyses?external_user_id=${encodeURIComponent(userId)}&limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    ),

  /**
   * Returns the analysis only if it belongs to this user. The gateway doesn't know our users,
   * so this check is what keeps one person from reading another's report by guessing an id.
   */
  async getAnalysisFor(userId: string, id: string): Promise<Analysis | null> {
    try {
      const analysis = await call<Analysis>(`/api/v1/analyses/${encodeURIComponent(id)}`);
      return analysis.external_user_id === userId ? analysis : null;
    } catch (err) {
      if (err instanceof GatewayError && err.status === 404) return null;
      throw err;
    }
  },

  deleteAnalysis: (id: string) => call<{ deleted: boolean }>(`/api/v1/analyses/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
