/** Database client (Neon over HTTP), created lazily so builds never need DATABASE_URL. */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export * from "./schema";
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | null = null;

export function db(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}

/** Tests swap in an in-memory Postgres. */
export function setDbForTests(replacement: Db | null) {
  instance = replacement;
}
