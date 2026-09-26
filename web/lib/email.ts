/**
 * Outgoing email over SMTP. avocousa.us runs on Google Workspace, so the default is Google's server with a mailbox's
 * app password: mail then leaves from our own domain, signed by Google, and a reply lands in that mailbox. The
 * mailbox and password come from the admin portal (the password stored sealed in the settings table) or, failing
 * that, from SMTP_USER / SMTP_PASS (and SMTP_HOST, SMTP_PORT, EMAIL_FROM_NAME) in the environment. Without either
 * nothing is sent and nothing else breaks.
 */
import "server-only";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, settings } from "./db";
import { open, seal, secretsReady } from "./secrets";

export const GOOGLE_SMTP = { host: "smtp.gmail.com", port: 465 };
export const DEFAULT_FROM_NAME = "AVOCO";

export interface EmailConfig { host: string; port: number; user: string; pass: string; fromName: string }

/** What the settings row holds. The password is sealed; the rest is for the admin page. */
interface StoredEmail { host: string; port: number; user: string; pass: string; fromName: string; savedBy: string; savedAt: string }

async function storedEmail(): Promise<StoredEmail | null> {
  const [row] = await db().select().from(settings).where(eq(settings.key, "email"));
  const value = row?.value as Partial<StoredEmail> | undefined;
  return value?.user && value.pass ? (value as StoredEmail) : null;
}

/** The mailbox in use: the one connected in the admin portal, or else the environment's. */
export async function emailConfig(): Promise<EmailConfig | null> {
  const stored = await storedEmail();
  if (stored && secretsReady()) {
    try {
      return { host: stored.host, port: stored.port, user: stored.user, pass: open(stored.pass), fromName: stored.fromName };
    } catch (err) {
      console.error("The stored email password can't be read (was SETTINGS_SECRET changed?)", err);
    }
  }
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return { host: process.env.SMTP_HOST || GOOGLE_SMTP.host, port: Number(process.env.SMTP_PORT) || GOOGLE_SMTP.port, user, pass, fromName: process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME };
}

const transportFor = (c: EmailConfig) =>
  nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, auth: { user: c.user, pass: c.pass }, connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 20_000 });

export interface EmailStatus {
  connected: boolean;
  source: "portal" | "environment" | null;
  /** The address receipts are sent from. */
  from: string | null;
  fromName: string | null;
  host: string | null;
  savedBy: string | null;
  savedAt: string | null;
  canStore: boolean;
}

/** For the admin page: is a mailbox connected, which one and from where. Never returns the password. */
export async function emailStatus(): Promise<EmailStatus> {
  const none: EmailStatus = { connected: false, source: null, from: null, fromName: null, host: null, savedBy: null, savedAt: null, canStore: secretsReady() };
  const stored = await storedEmail();
  if (stored && secretsReady()) {
    try {
      open(stored.pass); // proves the stored password still opens under this SETTINGS_SECRET
      return { ...none, connected: true, source: "portal", from: stored.user, fromName: stored.fromName, host: stored.host, savedBy: stored.savedBy, savedAt: stored.savedAt };
    } catch { /* fall through to the environment */ }
  }
  const env = await emailConfig();
  return env ? { ...none, connected: true, source: "environment", from: env.user, fromName: env.fromName, host: env.host } : none;
}

const ADDRESS = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
export const isEmailAddress = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && ADDRESS.test(v);

/** Google shows an app password as four groups of four letters; spaces are only for reading it. */
const cleanPassword = (raw: string) => raw.replace(/\s+/g, "");

/**
 * Stores the mailbox an admin connected, after logging in to the SMTP server with it: a wrong password or a mailbox
 * without app passwords is refused here, before anything is stored.
 */
export async function saveEmailSettings(input: { user: string; pass: string; fromName?: string; host?: string; port?: number }, by: string): Promise<{ ok: true; from: string } | { ok: false; reason: string }> {
  const user = input.user.trim().toLowerCase();
  const pass = cleanPassword(input.pass);
  const fromName = (input.fromName ?? "").trim().replace(/["<>\r\n]/g, "").slice(0, 60) || DEFAULT_FROM_NAME;
  const host = (input.host ?? "").trim() || GOOGLE_SMTP.host;
  const port = input.port && Number.isInteger(input.port) && input.port > 0 && input.port < 65536 ? input.port : GOOGLE_SMTP.port;
  if (!isEmailAddress(user)) return { ok: false, reason: "Enter the full mailbox address, for example support@avocousa.us." };
  if (pass.length < 8) return { ok: false, reason: "Paste the app password: 16 letters, from myaccount.google.com/apppasswords while signed in as that mailbox." };
  if (!secretsReady()) return { ok: false, reason: "The server has no SETTINGS_SECRET, so the password can't be stored safely. Ask your developer to set it." };

  const config: EmailConfig = { host, port, user, pass, fromName };
  try {
    await transportFor(config).verify();
  } catch (err) {
    const code = (err as { code?: string; responseCode?: number })?.responseCode;
    const reason = code === 535 || code === 534
      ? "Google refused the mailbox and password. Check the address, and create a new app password while signed in as that mailbox (2-Step Verification must be on)."
      : `The mail server could not be reached (${err instanceof Error ? err.message : "unknown error"}). Try again in a moment.`;
    return { ok: false, reason };
  }
  const value: StoredEmail = { host, port, user, pass: seal(pass), fromName, savedBy: by, savedAt: new Date().toISOString() };
  await db().insert(settings).values({ key: "email", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  return { ok: true, from: user };
}

export async function clearEmailSettings(): Promise<void> {
  await db().delete(settings).where(eq(settings.key, "email"));
}

export interface OutgoingEmail { to: string; subject: string; html: string; text: string; replyTo?: string }

/** Sends one email from the connected mailbox. Returns false, and sends nothing, when no mailbox is connected. */
export async function sendEmail(mail: OutgoingEmail): Promise<boolean> {
  const config = await emailConfig();
  if (!config) return false;
  await transportFor(config).sendMail({
    from: { name: config.fromName, address: config.user },
    to: mail.to,
    replyTo: mail.replyTo && mail.replyTo !== config.user ? mail.replyTo : undefined,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  return true;
}
