/**
 * Two reads straight from the gateway's `analyses` table, which lives in the same Neon database as the site's own
 * tables. Everything else about an analysis goes through the gateway's API (lib/gateway.ts); these two are asked very
 * often and the gateway adds nothing to the answer:
 *  - while AVOCO works, the report page asks every few seconds whether the analysis is still processing;
 *  - the free test site counts today's recordings before it takes another (lib/visitor.ts).
 * Read only: the site never writes the gateway's tables. Server only.
 */
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Under the gateway's 15-minute processing timeout: an older row goes the full way, where the gateway expires it. */
const FRESH_MINUTES = 14;

const rowsOf = (result: unknown) => ((result as { rows?: Record<string, unknown>[] }).rows ?? []);

/**
 * Is this person's analysis still waiting for AVOCO's answer? Only a young "processing" row says yes. A queued one
 * (AVOCO was down), a finished one, or one old enough to time out is answered by the gateway instead, because the
 * gateway's read is what retries the queue and expires a stuck analysis.
 */
export async function stillProcessing(owner: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const result = await db().execute(sql`select 1 from analyses where id = ${id} and external_user_id = ${owner} and status = 'processing' and created_at > now() - make_interval(mins => ${FRESH_MINUTES}) limit 1`);
  return rowsOf(result).length > 0;
}

/** Recordings made since midnight UTC by visitors of the free test site (owners "open:<id>", lib/visitor.ts). */
export async function openRecordingsToday(): Promise<number> {
  const result = await db().execute(sql`select count(*)::int as n from analyses where external_user_id like 'open:%' and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'`);
  return Number(rowsOf(result)[0]?.n ?? 0);
}
