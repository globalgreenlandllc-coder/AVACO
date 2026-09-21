/** Request-field parsing and the guarded audio download, shared by /analyze and /analyses. */
import type { AudioInput, Channel } from "./avoco";
import type { AnalysisType } from "./db/schema";
import { BadRequest } from "./http";

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const TYPES = ["both", "psytype", "emostate"] as const;

export function parseType(v: unknown): AnalysisType {
  if (v === undefined || v === null || v === "") return "both";
  if (!TYPES.includes(v as AnalysisType)) throw new BadRequest("'type' must be both, psytype or emostate");
  return v as AnalysisType;
}

export function parseChannel(v: unknown): Channel | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (n !== 0 && n !== 1) throw new BadRequest("'channel' must be 0 (left) or 1 (right)");
  return n;
}

/**
 * Validates audio_url: https only, and the host must be on ALLOWED_AUDIO_HOSTS.
 * This is what stops the API being used to probe other servers (SSRF).
 */
export function parseAudioUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== "string" || !rawUrl) throw new BadRequest("Field 'audio_url' is required");
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new BadRequest("'audio_url' is not a valid URL"); }
  if (url.protocol !== "https:") throw new BadRequest("'audio_url' must be https");
  if (url.username || url.password) throw new BadRequest("'audio_url' must not contain credentials");

  const allowed = (process.env.ALLOWED_AUDIO_HOSTS || ".blob.vercel-storage.com")
    .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  const host = url.hostname.toLowerCase();
  const hostOk = allowed.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
  if (!hostOk) throw new BadRequest(`Audio host '${host}' is not allowed`);
  return url;
}

export async function downloadAudio(rawUrl: unknown): Promise<AudioInput> {
  const url = parseAudioUrl(rawUrl);

  // Redirects are refused: an allowed host must not be able to bounce us to a host that isn't.
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "error" })
    .catch(() => { throw new BadRequest("Could not download audio"); });
  if (!res.ok) throw new BadRequest(`Could not download audio (${res.status})`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES) throw new BadRequest("File exceeds 10 MB");

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_AUDIO_BYTES) throw new BadRequest("File exceeds 10 MB");
  if (bytes.byteLength === 0) throw new BadRequest("Audio file is empty");
  return { bytes, filename: filenameOf(url) };
}

function filenameOf(url: URL): string {
  const last = url.pathname.split("/").pop() || "audio";
  try { return decodeURIComponent(last); } catch { return last; }
}
