/**
 * Extra languages, made by DeepL from the English dictionary and kept in the translations table.
 *
 * The admin connects a DeepL API key in the portal (stored sealed, like the Stripe keys), then adds a
 * language: every English string is translated once, in chunks, and stored with a hash of its source.
 * A language whose every string is translated becomes available in the language menu. When the English
 * changes later, only the changed strings are translated again. Placeholders like {price} travel through
 * DeepL inside <x> tags it is told to leave alone.
 */
import "server-only";
import { createHash } from "node:crypto";
import { count, eq, max, sql } from "drizzle-orm";
import { db, settings, translations } from "./db";
import { en, type Dict } from "./i18n/en";
import { flatten, unflatten, type Flat } from "./i18n/flat";
import { BUILT_IN, TRANSLATABLE, type Language } from "./i18n/languages";
import { open, seal, secretsReady } from "./secrets";

// ---------- the DeepL key ----------

interface StoredDeepl { key: string; keyHint: string; savedBy: string; savedAt: string }
export interface DeeplConfig { key: string; endpoint: string }

/** Free keys end in ":fx" and live on another host. */
const endpointFor = (key: string) => (key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");

async function storedDeepl(): Promise<StoredDeepl | null> {
  const [row] = await db().select().from(settings).where(eq(settings.key, "deepl"));
  const value = row?.value as Partial<StoredDeepl> | undefined;
  return value?.key ? (value as StoredDeepl) : null;
}

export async function deeplConfig(): Promise<DeeplConfig | null> {
  const stored = await storedDeepl();
  if (stored && secretsReady()) {
    try { const key = open(stored.key); return { key, endpoint: endpointFor(key) }; } catch (err) { console.error("The stored DeepL key can't be read", err); }
  }
  const key = process.env.DEEPL_API_KEY;
  return key ? { key, endpoint: endpointFor(key) } : null;
}

export interface DeeplUsage { used: number; limit: number }

/** Asks DeepL whether a key works, and how much of its allowance is used. */
export async function checkDeeplKey(key: string): Promise<{ ok: true; usage: DeeplUsage } | { ok: false; reason: string }> {
  const res = await fetch(`${endpointFor(key)}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${key}` }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res) return { ok: false, reason: "DeepL could not be reached. Try again in a moment." };
  if (res.status === 403) return { ok: false, reason: "DeepL refused the key. Copy it again from deepl.com → Account → API keys." };
  if (!res.ok) return { ok: false, reason: `DeepL answered ${res.status}.` };
  const body = await res.json().catch(() => ({}));
  return { ok: true, usage: { used: Number(body.character_count) || 0, limit: Number(body.character_limit) || 0 } };
}

export async function saveDeeplKey(rawKey: string, by: string): Promise<{ ok: true; usage: DeeplUsage } | { ok: false; reason: string }> {
  const key = rawKey.trim();
  if (!/^[0-9a-f-]{30,}(:fx)?$/i.test(key)) return { ok: false, reason: "That doesn't look like a DeepL API key (a long code, ending in :fx for a free account)." };
  if (!secretsReady()) return { ok: false, reason: "The server has no SETTINGS_SECRET, so keys can't be stored safely. Ask your developer to set it." };
  const check = await checkDeeplKey(key);
  if (!check.ok) return check;
  const value: StoredDeepl = { key: seal(key), keyHint: `…${key.replace(/:fx$/, "").slice(-4)}${key.endsWith(":fx") ? " (free)" : ""}`, savedBy: by, savedAt: new Date().toISOString() };
  await db().insert(settings).values({ key: "deepl", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  return { ok: true, usage: check.usage };
}

export async function clearDeeplKey(): Promise<void> {
  await db().delete(settings).where(eq(settings.key, "deepl"));
}

export interface DeeplStatus { connected: boolean; source: "portal" | "environment" | null; keyHint: string | null; savedBy: string | null; savedAt: string | null; usage: DeeplUsage | null; canStore: boolean }

export async function deeplStatus(): Promise<DeeplStatus> {
  const none: DeeplStatus = { connected: false, source: null, keyHint: null, savedBy: null, savedAt: null, usage: null, canStore: secretsReady() };
  const cfg = await deeplConfig();
  if (!cfg) return none;
  const stored = await storedDeepl();
  const check = await checkDeeplKey(cfg.key);
  const usage = check.ok ? check.usage : null;
  if (stored && secretsReady()) return { ...none, connected: true, source: "portal", keyHint: stored.keyHint, savedBy: stored.savedBy, savedAt: stored.savedAt, usage };
  return { ...none, connected: true, source: "environment", keyHint: `…${cfg.key.slice(-4)}`, usage };
}

// ---------- translating ----------

const PLACEHOLDER = /\{[a-zA-Z]+\}/g;
const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Wraps placeholders so DeepL leaves them alone, and undoes it on the way back. */
export const protect = (s: string) => escapeXml(s).replace(PLACEHOLDER, (m) => `<x>${m}</x>`);
export const unprotect = (s: string) => unescapeXml(s.replace(/<\/?x>/g, ""));

const BATCH_TEXTS = 50, BATCH_CHARS = 60_000;

/** One DeepL call per batch, in order. Throws with DeepL's reason when a batch fails. */
export async function translateTexts(texts: string[], target: string, cfg: DeeplConfig): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length;) {
    const batch: string[] = [];
    let chars = 0;
    while (i < texts.length && batch.length < BATCH_TEXTS && (batch.length === 0 || chars + texts[i].length <= BATCH_CHARS)) { chars += texts[i].length; batch.push(texts[i++]); }
    const res = await fetch(`${cfg.endpoint}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${cfg.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: batch.map(protect), source_lang: "EN", target_lang: target, tag_handling: "xml", ignore_tags: ["x"], preserve_formatting: true }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`DeepL ${res.status}: ${body?.message ?? "translation failed"}`);
    const got: string[] = (body.translations ?? []).map((t: { text: string }) => unprotect(t.text));
    if (got.length !== batch.length) throw new Error("DeepL returned a different number of texts");
    out.push(...got);
  }
  return out;
}

// ---------- building a language ----------

const hashOf = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);
const source = (): Array<[string, string]> => Object.entries(flatten(en));

export interface LanguageProgress { total: number; done: number }

/** How many of the English strings this language has an up-to-date translation for. */
export async function languageProgress(lang: string): Promise<LanguageProgress> {
  const entries = source();
  const rows = await db().select({ path: translations.path, sourceHash: translations.sourceHash }).from(translations).where(eq(translations.lang, lang));
  const have = new Map(rows.map((r) => [r.path, r.sourceHash]));
  return { total: entries.length, done: entries.filter(([path, text]) => have.get(path) === hashOf(text)).length };
}

/**
 * Translates up to `maxStrings` strings that this language lacks (or whose English changed) and stores them.
 * Called repeatedly from the portal until done, so no single call outlives a server function.
 */
export async function buildLanguage(lang: string, by: string, maxStrings = 120): Promise<LanguageProgress> {
  const language = TRANSLATABLE.find((l) => l.code === lang);
  if (!language) throw new Error("Unknown language");
  const cfg = await deeplConfig();
  if (!cfg) throw new Error("DeepL is not connected");
  const entries = source();
  const rows = await db().select({ path: translations.path, sourceHash: translations.sourceHash }).from(translations).where(eq(translations.lang, lang));
  const have = new Map(rows.map((r) => [r.path, r.sourceHash]));
  const pending = entries.filter(([path, text]) => have.get(path) !== hashOf(text)).slice(0, maxStrings);
  if (pending.length > 0) {
    const translated = await translateTexts(pending.map(([, text]) => text), language.deepl, cfg);
    const values = pending.map(([path, text], i) => ({ lang, path, sourceHash: hashOf(text), text: translated[i], updatedAt: new Date() }));
    await db().insert(translations).values(values).onConflictDoUpdate({ target: [translations.lang, translations.path], set: { sourceHash: sql`excluded.source_hash`, text: sql`excluded.text`, updatedAt: sql`excluded.updated_at` } });
    console.log(`translations: ${by} built ${values.length} ${lang} strings`);
    versions.clear();
  }
  return languageProgress(lang);
}

/** Progress of every added language at once, for the admin page. */
export async function allProgress(): Promise<Map<string, LanguageProgress>> {
  const entries = source();
  const current = new Map(entries.map(([path, text]) => [path, hashOf(text)]));
  const rows = await db().select({ lang: translations.lang, path: translations.path, sourceHash: translations.sourceHash }).from(translations);
  const out = new Map<string, LanguageProgress>();
  for (const r of rows) {
    const p = out.get(r.lang) ?? { total: entries.length, done: 0 };
    if (current.get(r.path) === r.sourceHash) p.done += 1;
    out.set(r.lang, p);
  }
  return out;
}

/** The size of one language, for the admin page's cost note. */
export const dictionaryCharacters = () => source().reduce((n, [, text]) => n + text.length, 0);

export async function removeLanguage(lang: string): Promise<void> {
  await db().delete(translations).where(eq(translations.lang, lang));
  versions.clear();
}

// ---------- serving ----------

/** Per-language version (rows and last change) so a built dictionary is reloaded only when it changed. */
const versions = new Map<string, { at: number; value: Map<string, string> }>();
const VERSION_TTL_MS = 30_000;

async function languageVersions(): Promise<Map<string, string>> {
  const cached = versions.get("all");
  if (cached && Date.now() - cached.at < VERSION_TTL_MS) return cached.value;
  const rows = await db().select({ lang: translations.lang, n: count(), at: max(translations.updatedAt) }).from(translations).groupBy(translations.lang);
  const value = new Map(rows.map((r) => [r.lang, `${r.n}:${r.at?.toISOString() ?? ""}`]));
  versions.set("all", { at: Date.now(), value });
  return value;
}

/**
 * A language stays in the menu while at least this share of the English strings has a translation. Strings
 * without one fall back to English (see unflatten), so a language built once must not vanish every time a
 * deploy adds a few English strings; an admin or `npm run languages:build` tops it up.
 */
export const AVAILABLE_SHARE = 0.9;

/** The languages the menu offers: the two written by hand, and every added language that is (nearly) complete. */
export async function availableLanguages(): Promise<Language[]> {
  const needed = Math.ceil(source().length * AVAILABLE_SHARE);
  const built = await languageVersions().catch(() => new Map<string, string>());
  return [...BUILT_IN, ...TRANSLATABLE.filter((l) => Number(built.get(l.code)?.split(":")[0]) >= needed)];
}

const dicts = new Map<string, { version: string; dict: Dict }>();

/** The English dictionary with every string replaced by this language's translation. */
export async function translatedDict(lang: string): Promise<Dict> {
  const version = (await languageVersions()).get(lang) ?? "";
  const hit = dicts.get(lang);
  if (hit && hit.version === version) return hit.dict;
  const rows = await db().select({ path: translations.path, text: translations.text }).from(translations).where(eq(translations.lang, lang));
  const strings: Flat = Object.fromEntries(rows.map((r) => [r.path, r.text]));
  const dict = unflatten(en, strings);
  dicts.set(lang, { version, dict });
  return dict;
}

/** For tests and after a build: forget what is memoised. */
export function forgetTranslations() { versions.clear(); dicts.clear(); }
