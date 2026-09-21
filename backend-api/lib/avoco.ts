/**
 * AVOCO upstream client. Server-only — never import this into browser code.
 * Handles login + token refresh automatically; the token is cached per warm instance.
 */
export type Channel = 0 | 1;
export type AnalysisKind = "psytype" | "emostate";
export interface ScaleValue { id: number; name: string; value: number }
export interface AudioInput { bytes: Uint8Array<ArrayBuffer>; filename: string }

export class AvocoApiError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
    this.name = "AvocoApiError";
  }
}

const EXPIRY_MARGIN_MS = 60_000;

export class AvocoClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpiresAt = 0;
  private pendingAuth: Promise<string> | null = null;

  constructor(private username: string, private password: string, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessExpiresAt) return this.accessToken;
    this.pendingAuth ??= this.authenticate().finally(() => { this.pendingAuth = null; });
    return this.pendingAuth;
  }

  private async authenticate(): Promise<string> {
    if (this.refreshToken) {
      try {
        const d = await this.postJson("/api/v2/auth/refresh", { refresh_token: this.refreshToken });
        return this.store(d.access_token, d.expires_in);
      } catch {
        this.refreshToken = null;
      }
    }
    const d = await this.postJson("/api/v2/auth/login", { username: this.username, password: this.password });
    this.refreshToken = d.refresh_token;
    return this.store(d.access_token, d.expires_in);
  }

  private store(token: string, expiresInSec: number) {
    this.accessToken = token;
    this.accessExpiresAt = Date.now() + expiresInSec * 1000 - EXPIRY_MARGIN_MS;
    return token;
  }

  private async postJson(path: string, body: unknown) {
    const res = await fetch(this.baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    }).catch(unreachable);
    const text = await res.text();
    if (!res.ok) throw new AvocoApiError(`AVOCO ${path} failed`, res.status, text);
    return JSON.parse(text);
  }

  /** Synchronous analysis: waits for AVOCO and returns the raw scales. */
  async analyze(kind: AnalysisKind, audio: AudioInput, channel?: Channel): Promise<ScaleValue[]> {
    const data = await this.postAudio(`/api/v2/analyze/${kind}`, audio, channel);
    return kind === "psytype" ? data.psy_types : data.emo_scales;
  }

  /** Asynchronous analysis: AVOCO answers 202 now and POSTs the result to callbackUrl later. */
  async submitCallback(kind: AnalysisKind, audio: AudioInput, job: { id: string; callbackUrl: string }, channel?: Channel): Promise<void> {
    await this.postAudio(`/api/v2/analyze/${kind}/callback`, audio, channel, { id: job.id, callback_url: job.callbackUrl });
  }

  private async postAudio(path: string, audio: AudioInput, channel?: Channel, fields: Record<string, string> = {}) {
    const url = new URL(this.baseUrl + path);
    if (channel !== undefined) url.searchParams.set("channel", String(channel));

    const send = async () => {
      const form = new FormData();
      form.append("file", new Blob([audio.bytes]), audio.filename);
      for (const [name, value] of Object.entries(fields)) form.append(name, value);
      return fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        body: form,
        signal: AbortSignal.timeout(280_000),
      }).catch(unreachable);
    };

    let res = await send();
    if (res.status === 401) {
      this.accessToken = null;
      res = await send();
    }
    const text = await res.text();
    if (!res.ok) throw new AvocoApiError(`AVOCO ${path} failed`, res.status, text);
    return JSON.parse(text);
  }
}

/** Network failure or timeout: reported as status 0, which callers map to 502. */
function unreachable(err: unknown): never {
  throw new AvocoApiError(`AVOCO unreachable: ${err instanceof Error ? err.message : String(err)}`, 0, "");
}

let singleton: AvocoClient | null = null;
/** Tests only: forget the cached client and its tokens. */
export function resetAvocoForTests() { singleton = null; }

export function avoco(): AvocoClient {
  if (!singleton) {
    const { AVOCO_API_USER, AVOCO_API_PASSWORD, AVOCO_BASE_URL } = process.env;
    if (!AVOCO_API_USER || !AVOCO_API_PASSWORD) throw new Error("AVOCO credentials are not configured");
    singleton = new AvocoClient(AVOCO_API_USER, AVOCO_API_PASSWORD, AVOCO_BASE_URL || "https://voice.voxera.kz");
  }
  return singleton;
}

// Readable output lives in lib/format; re-exported for existing imports.
export { formatEmostate, formatPsytype } from "./format";
