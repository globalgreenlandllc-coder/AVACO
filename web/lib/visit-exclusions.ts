/**
 * Browsers that never count in Admin → Statistics: the admins' own (lib/db/schema.ts `visit_exclusions`). Noting one
 * also deletes what it recorded before it was recognised, so a look at the site before signing in leaves no trace in
 * the numbers either. Server only.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { db, visitExclusions, visits } from "./db";

export async function excludeVisitor(visitor: string, userId: string | null): Promise<void> {
  await db().insert(visitExclusions).values({ visitor, userId }).onConflictDoNothing();
  await db().delete(visits).where(eq(visits.visitor, visitor));
}

export async function isExcludedVisitor(visitor: string): Promise<boolean> {
  const [row] = await db().select({ visitor: visitExclusions.visitor }).from(visitExclusions).where(eq(visitExclusions.visitor, visitor));
  return Boolean(row);
}
