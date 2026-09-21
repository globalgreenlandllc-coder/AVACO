/** Shared test setup: env, in-memory Postgres built from the real migrations, and a fake Blob host. */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { vi } from "vitest";
import { resetAvocoForTests } from "@/lib/avoco";
import { setDbForTests, type Db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const API_KEY = "test-key-0123456789abcdef";
export const CALLBACK_SECRET = "callback-secret-xyz";
export const AUDIO_URL = "https://store123.public.blob.vercel-storage.com/rec-abc.m4a";

export function setEnv(avocoUrl: string) {
  Object.assign(process.env, {
    AVOCO_API_USER: "api_demo",
    AVOCO_API_PASSWORD: "pw",
    AVOCO_BASE_URL: avocoUrl,
    PLATFORM_API_KEYS: `other-key, ${API_KEY}`,
    AVOCO_CALLBACK_SECRET: CALLBACK_SECRET,
    APP_BASE_URL: "https://gateway.example.com/",
    ALLOWED_AUDIO_HOSTS: "",
  });
  resetAvocoForTests();
}

export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  setDbForTests(db);
  return { db, close: async () => { setDbForTests(null); await client.close(); } };
}

/** Serves fake audio for Blob URLs and records every other host that gets fetched. */
export function stubAudioHost() {
  const realFetch = globalThis.fetch;
  const downloads: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "127.0.0.1") return realFetch(input, init);
    downloads.push(url.toString());
    if (url.hostname.endsWith(".blob.vercel-storage.com")) return new Response(new Uint8Array(2048), { headers: { "content-type": "audio/mp4" } });
    throw new Error(`Unexpected outbound request to ${url.hostname}`);
  });
  return downloads;
}

export function request(method: string, path: string, opts: { key?: string | null; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.key !== null) headers.authorization = `Bearer ${opts.key ?? API_KEY}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return new Request(`https://gateway.example.com${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
}

export const params = (id: string) => ({ params: Promise.resolve({ id }) });
