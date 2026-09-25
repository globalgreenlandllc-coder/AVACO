import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { en } from "@/lib/i18n/en";
import { flatten, unflatten } from "@/lib/i18n/flat";
import { BUILT_IN, TRANSLATABLE } from "@/lib/i18n/languages";
import { availableLanguages, buildLanguage, forgetTranslations, languageProgress, protect, removeLanguage, saveDeeplKey, translatedDict, translateTexts, unprotect } from "@/lib/translate";

let client: PGlite;
let db: Db;
const KEY = "12345678-1234-1234-1234-123456789abc:fx";

/** Pretends to be DeepL: "translates" by wrapping each text in « », leaving ignored tags as they are. */
function stubDeepl() {
  const calls: Array<{ url: string; texts: string[]; target: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
    if (auth !== `DeepL-Auth-Key ${KEY}`) return new Response(JSON.stringify({ message: "Wrong key" }), { status: 403 });
    if (String(url).endsWith("/v2/usage")) return new Response(JSON.stringify({ character_count: 12345, character_limit: 500000 }), { status: 200 });
    const body = JSON.parse(String(init?.body));
    calls.push({ url: String(url), texts: body.text, target: body.target_lang });
    return new Response(JSON.stringify({ translations: body.text.map((t: string) => ({ detected_source_language: "EN", text: `«${t}»` })) }), { status: 200 });
  }));
  return calls;
}

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  process.env.SETTINGS_SECRET = "test-settings-secret-0123456789";
  delete process.env.DEEPL_API_KEY;
  await db.delete(schema.settings);
  await db.delete(schema.translations);
  forgetTranslations();
});
afterEach(() => vi.unstubAllGlobals());

describe("flat dictionaries", () => {
  it("flattens every string with its path and rebuilds the same shape", () => {
    const flat = flatten(en);
    expect(flat["home.title"]).toBe(en.home.title);
    expect(flat["home.steps[1].title"]).toBe(en.home.steps[1].title);
    expect(Object.keys(flat).length).toBeGreaterThan(1500);
    const back = unflatten(en, Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v.toUpperCase()])));
    expect(back.home.title).toBe(en.home.title.toUpperCase());
    expect(back.home.steps[1].title).toBe(en.home.steps[1].title.toUpperCase());
    expect(Object.keys(back)).toEqual(Object.keys(en));
    expect(unflatten(en, {})).toEqual(en); // nothing translated: unchanged
  });

  it("keeps placeholders and markup-like characters intact through DeepL's XML mode", () => {
    expect(protect("One report, {price} & <more>")).toBe("One report, <x>{price}</x> &amp; &lt;more&gt;");
    expect(unprotect("Un rapport, <x>{price}</x> &amp; &lt;plus&gt;")).toBe("Un rapport, {price} & <plus>");
  });
});

describe("DeepL", () => {
  it("refuses a malformed or rejected key, accepts a working one and reports usage", async () => {
    stubDeepl();
    expect(await saveDeeplKey("not-a-key", "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("DeepL API key") });
    expect(await saveDeeplKey(KEY.replace("abc", "def"), "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("refused") });
    expect(await saveDeeplKey(` ${KEY} `, "dima@example.com")).toEqual({ ok: true, usage: { used: 12345, limit: 500000 } });
    const [row] = await db.select().from(schema.settings);
    expect(JSON.stringify(row.value)).not.toContain(KEY);
  });

  it("translates in batches of at most 50 texts, in order", async () => {
    const calls = stubDeepl();
    const texts = Array.from({ length: 120 }, (_, i) => `text ${i}`);
    const out = await translateTexts(texts, "ES", { key: KEY, endpoint: "https://api-free.deepl.com" });
    expect(out).toHaveLength(120);
    expect(out[0]).toBe("«text 0»");
    expect(out[119]).toBe("«text 119»");
    expect(calls.map((c) => c.texts.length)).toEqual([50, 50, 20]);
    expect(calls[0].target).toBe("ES");
    expect(calls[0].url).toBe("https://api-free.deepl.com/v2/translate");
  });
});

describe("adding a language", () => {
  it("builds Spanish in steps, then serves a translated dictionary and lists the language", async () => {
    stubDeepl();
    await saveDeeplKey(KEY, "dima");
    expect((await availableLanguages()).map((l) => l.code)).toEqual(BUILT_IN.map((l) => l.code));

    let p = await buildLanguage("es", "dima", 500);
    expect(p.total).toBeGreaterThan(1500);
    expect(p.done).toBe(500);
    expect((await availableLanguages()).some((l) => l.code === "es")).toBe(false); // not until complete
    while (p.done < p.total) p = await buildLanguage("es", "dima", 500);
    expect(p.done).toBe(p.total);
    expect(await languageProgress("es")).toEqual(p);

    expect((await availableLanguages()).map((l) => l.code)).toContain("es");
    const dict = await translatedDict("es");
    expect(dict.home.title).toBe(`«${en.home.title}»`);
    expect(dict.home.steps[1].title).toBe(`«${en.home.steps[1].title}»`);
    expect(dict.home.priceTitle).toContain("{price}"); // placeholder survived
    expect(Object.keys(dict)).toEqual(Object.keys(en));
  });

  it("translates again only what changed, and removal takes the language away", async () => {
    stubDeepl();
    await saveDeeplKey(KEY, "dima");
    let p = await buildLanguage("de", "dima", 2000);
    expect(p.done).toBe(p.total);
    // pretend one English string changed: its stored hash no longer matches the source
    await db.update(schema.translations).set({ sourceHash: "stale", text: "old" }).where(and(eq(schema.translations.lang, "de"), eq(schema.translations.path, "home.title")));
    forgetTranslations();
    expect((await languageProgress("de")).done).toBe(p.total - 1);
    p = await buildLanguage("de", "dima", 2000);
    expect(p.done).toBe(p.total);
    expect((await translatedDict("de")).home.title).toBe(`«${en.home.title}»`);
    expect(await buildLanguage("de", "dima", 2000)).toEqual(p); // nothing left to do
    await removeLanguage("de");
    expect((await availableLanguages()).some((l) => l.code === "de")).toBe(false);
    expect((await languageProgress("de")).done).toBe(0);
  });

  it("refuses an unknown language and reports DeepL's failure instead of storing garbage", async () => {
    stubDeepl();
    await saveDeeplKey(KEY, "dima");
    await expect(buildLanguage("xx", "dima")).rejects.toThrow("Unknown language");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "Quota exceeded" }), { status: 456 })));
    await expect(buildLanguage(TRANSLATABLE[0].code, "dima", 10)).rejects.toThrow("DeepL 456: Quota exceeded");
    expect((await languageProgress(TRANSLATABLE[0].code)).done).toBe(0);
  });
});
