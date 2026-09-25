/**
 * Sealing for secrets an admin pastes into the portal (Stripe keys). AES-256-GCM with a key derived from
 * SETTINGS_SECRET, so a copy of the database alone reveals nothing. Sealed values look like
 * "v1.<iv>.<tag>.<data>" (base64url) and fail to open when tampered with or sealed under another secret.
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const MIN_SECRET_LENGTH = 16;

/** True when the server has a SETTINGS_SECRET, i.e. it can store what an admin pastes. */
export const secretsReady = () => (process.env.SETTINGS_SECRET ?? "").length >= MIN_SECRET_LENGTH;

function key(): Buffer {
  const secret = process.env.SETTINGS_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) throw new Error("SETTINGS_SECRET is not set");
  return createHash("sha256").update(secret).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Not a sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
