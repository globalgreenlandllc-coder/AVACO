/**
 * AVOCO API client (v2.4) — voice-based psychotype & emotional-state analysis.
 * Handles login, access-token refresh, and re-login automatically.
 * Requires Node 18+ (native fetch / FormData / Blob).
 */
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

export type Channel = 0 | 1; // 0 = left, 1 = right

export interface ScaleValue {
  id: number;
  name: string;
  value: number; // 0–100
}
export interface PsytypeResult { psy_types: ScaleValue[] }
export interface EmostateResult { emo_scales: ScaleValue[] }
export interface AcceptedResponse { id: string; status: "accepted"; message: string }
/** Body AVOCO POSTs to your callback_url */
export type CallbackPayload =
  | ({ id: string } & PsytypeResult)
  | ({ id: string } & EmostateResult);

export const PSYTYPE_LABELS: Record<string, string> = {
  organizer: "Organizer", driver: "Driver", catalyst: "Catalyst", performer: "Performer",
  harmonizer: "Harmonizer", analyst: "Analyst", skeptic: "Skeptic", mediator: "Mediator",
};

export const EMOSTATE_LABELS: Record<string, string> = {
  energy_level: "Cheerfulness", stress_tolerance: "Stability", openness_to_new: "Openness to experience",
  emotional_confidence: "Emotionality", ability_to_assert: "Independence", ability_to_set_goals: "Fulfillment",
  self_control: "Self-control", ability_to_attract: "Attractiveness", person_manifestation: "Demonstrativeness",
  person_harmonicity: "Composure", authority: "Dominance", kindness: "Friendliness",
  expressivity: "Expressiveness", emo_engage: "Inspiration",
};

export class AvocoApiError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
    this.name = "AvocoApiError";
  }
}

export interface AvocoClientOptions {
  username: string;
  password: string;
  baseUrl?: string;
  timeoutMs?: number; // sync analysis can take a while
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per docs
const EXPIRY_MARGIN_MS = 60_000;         // refresh 1 min before expiry

export class AvocoClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private accessExpiresAt = 0;
  private pendingAuth: Promise<string> | null = null;

  constructor(private opts: AvocoClientOptions) {
    this.baseUrl = (opts.baseUrl ?? "https://voice.voxera.kz").replace(/\/$/, "");
  }

  // ---------- auth ----------

  /** Returns a valid access token, logging in or refreshing as needed. */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessExpiresAt) return this.accessToken;
    // Share one in-flight auth call between concurrent requests
    this.pendingAuth ??= this.authenticate().finally(() => { this.pendingAuth = null; });
    return this.pendingAuth;
  }

  private async authenticate(): Promise<string> {
    if (this.refreshToken) {
      try {
        return await this.refresh();
      } catch {
        this.refreshToken = null; // refresh token expired/invalid → full login
      }
    }
    return this.login();
  }

  private async login(): Promise<string> {
    const data = await this.postJson("/api/v2/auth/login", {
      username: this.opts.username,
      password: this.opts.password,
    });
    this.refreshToken = data.refresh_token;
    return this.storeAccess(data.access_token, data.expires_in);
  }

  private async refresh(): Promise<string> {
    const data = await this.postJson("/api/v2/auth/refresh", { refresh_token: this.refreshToken });
    return this.storeAccess(data.access_token, data.expires_in);
  }

  private storeAccess(token: string, expiresInSec: number): string {
    this.accessToken = token;
    this.accessExpiresAt = Date.now() + expiresInSec * 1000 - EXPIRY_MARGIN_MS;
    return token;
  }

  private async postJson(path: string, body: unknown): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) throw new AvocoApiError(`${path} failed (${res.status})`, res.status, text);
    return JSON.parse(text);
  }

  // ---------- analysis ----------

  /** Synchronous psychotype analysis. */
  analyzePsytype(filePath: string, channel?: Channel): Promise<PsytypeResult> {
    return this.analyze("/api/v2/analyze/psytype", filePath, channel);
  }

  /** Synchronous emotional-state analysis. */
  analyzeEmostate(filePath: string, channel?: Channel): Promise<EmostateResult> {
    return this.analyze("/api/v2/analyze/emostate", filePath, channel);
  }

  /** Async psychotype analysis; result is POSTed to callbackUrl. */
  submitPsytype(filePath: string, callbackUrl: string, id: string = crypto.randomUUID(), channel?: Channel) {
    return this.analyze<AcceptedResponse>("/api/v2/analyze/psytype/callback", filePath, channel, { id, callback_url: callbackUrl });
  }

  /** Async emotional-state analysis; result is POSTed to callbackUrl. */
  submitEmostate(filePath: string, callbackUrl: string, id: string = crypto.randomUUID(), channel?: Channel) {
    return this.analyze<AcceptedResponse>("/api/v2/analyze/emostate/callback", filePath, channel, { id, callback_url: callbackUrl });
  }

  private async analyze<T>(
    path: string,
    filePath: string,
    channel?: Channel,
    fields: Record<string, string> = {},
  ): Promise<T> {
    const { size } = await stat(filePath);
    if (size > MAX_FILE_BYTES) throw new Error(`File is ${(size / 1e6).toFixed(1)} MB; AVOCO limit is 10 MB`);
    const bytes = await readFile(filePath);

    const url = new URL(this.baseUrl + path);
    if (channel !== undefined) url.searchParams.set("channel", String(channel));

    const send = async () => {
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      form.append("file", new Blob([bytes]), basename(filePath));
      return fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        body: form,
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 180_000),
      });
    };

    let res = await send();
    if (res.status === 401) {
      // Token rejected early (revoked/clock skew) → force re-auth once and retry
      this.accessToken = null;
      res = await send();
    }
    const text = await res.text();
    if (!res.ok) throw new AvocoApiError(`${path} failed (${res.status})`, res.status, text);
    return JSON.parse(text) as T;
  }
}

/** Sorts results high→low and attaches readable labels. */
export function withLabels(scales: ScaleValue[], labels: Record<string, string>) {
  return [...scales]
    .sort((a, b) => b.value - a.value)
    .map((s) => ({ ...s, label: labels[s.name] ?? s.name }));
}

/** Psychotype zones per AVOCO docs: >~50 leading, ~30–50 active, <30 background. */
export function psytypeZone(value: number): "leading" | "active" | "background" {
  if (value >= 50) return "leading";
  if (value >= 30) return "active";
  return "background";
}
