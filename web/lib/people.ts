/**
 * Whose voice a report is. The account holder can record someone else (a partner, a child, a client) and give the
 * report that person's name; a report without a name is their own. Everything that reads several reports together
 * reads one person at a time: the type across recordings (lib/profile.ts), the trends and the list on My reports.
 * Names are matched without regard to case or spacing, so "anna" and "Anna " are the same person.
 */
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, reportPeople } from "./db";
import { cleanName, personKey } from "./person";

export { cleanName, MAX_NAME, nameSlug, peopleIn, personKey, reportsOf, type Person } from "./person";

/** Every named report of an account: analysis id → name. A lookup failure reads as "all my own", never as an error page. */
export async function namesFor(owner: string): Promise<Map<string, string>> {
  try {
    const rows = await db().select({ id: reportPeople.analysisId, name: reportPeople.name }).from(reportPeople).where(eq(reportPeople.ownerId, owner));
    return new Map(rows.map((r) => [r.id, r.name]));
  } catch (err) {
    console.error("Could not read report names", err);
    return new Map();
  }
}

/** The distinct names an account has used, most recent first: the suggestions offered when naming a report. */
export async function knownNames(owner: string): Promise<string[]> {
  try {
    const rows = await db().select({ name: reportPeople.name, at: reportPeople.updatedAt }).from(reportPeople).where(eq(reportPeople.ownerId, owner));
    const seen = new Map<string, { name: string; at: number }>();
    for (const r of rows) {
      const key = personKey(r.name), at = new Date(r.at).getTime();
      if (!seen.has(key) || seen.get(key)!.at < at) seen.set(key, { name: r.name, at });
    }
    return [...seen.values()].sort((a, b) => b.at - a.at).map((p) => p.name);
  } catch (err) {
    console.error("Could not read report names", err);
    return [];
  }
}

/** Names a report, or with null gives it back to the account holder. The caller has checked that the report is theirs. */
export async function setPerson(owner: string, analysisId: string, raw: unknown): Promise<string | null> {
  const name = cleanName(raw);
  if (!name) {
    await db().delete(reportPeople).where(and(eq(reportPeople.analysisId, analysisId), eq(reportPeople.ownerId, owner)));
    return null;
  }
  // One person, one spelling: writing "Anna" where "anna" was used corrects it on every report of that person.
  const key = personKey(name), now = new Date();
  const same = (await db().select({ id: reportPeople.analysisId, name: reportPeople.name }).from(reportPeople).where(eq(reportPeople.ownerId, owner)))
    .filter((r) => personKey(r.name) === key && r.name !== name).map((r) => r.id);
  if (same.length) await db().update(reportPeople).set({ name, updatedAt: now }).where(and(eq(reportPeople.ownerId, owner), inArray(reportPeople.analysisId, same)));
  await db().insert(reportPeople).values({ analysisId, ownerId: owner, name, updatedAt: now })
    .onConflictDoUpdate({ target: reportPeople.analysisId, set: { name, updatedAt: now } });
  return name;
}

/** A deleted report takes its name with it. */
export async function forgetPeople(analysisIds: string[]): Promise<void> {
  if (analysisIds.length) await db().delete(reportPeople).where(inArray(reportPeople.analysisId, analysisIds));
}
