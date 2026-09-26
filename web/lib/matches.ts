/**
 * Relationship matches: ordering, the partner's private link, their recordings and the finished report.
 * The orderer's profile is their consensus across recordings (lib/profile.ts); the partner's is the consensus
 * across the recordings made on their link, filed in the gateway under "m:<matchId>". Server only.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { asUser, chargeMatch, matchIsFree, NoCredits } from "./billing";
import { consensus } from "./consensus";
import { db, matches, type OwnerKind } from "./db";
import { gateway, type Analysis } from "./gateway";
import type { Dict } from "./i18n";
import { matchFit } from "./match";
import { matchReport, type MatchReport } from "./match-report";
import { profileFor } from "./profile";
import { Invalid, NotFound } from "./workspaces";

export type Match = typeof matches.$inferSelect;
export const partnerOwner = (matchId: string) => `m:${matchId}`;
const clean = (v: unknown, max: number, what: string) => { const s = typeof v === "string" ? v.trim() : ""; if (!s || s.length > max) throw new Invalid(`${what} is required (up to ${max} characters)`); return s; };

/** Orders a match from one of the person's own completed reports. Charges MATCH_CREDITS unless free for them. */
export async function createMatch(userId: string, input: { analysisId: unknown; ownerName: unknown; partnerName: unknown; withFamily?: unknown }): Promise<Match> {
  const analysisId = typeof input.analysisId === "string" ? input.analysisId : "";
  const analysis = analysisId ? await gateway.getAnalysisFor(userId, analysisId) : null;
  if (!analysis || analysis.status !== "completed" || !analysis.psytype?.length) throw new NotFound("Report not found");
  const ownerName = clean(input.ownerName, 60, "Your name"), partnerName = clean(input.partnerName, 60, "Partner's name");
  const id = crypto.randomUUID();
  const free = await matchIsFree(userId);
  if (!free && !(await chargeMatch(asUser(userId), id))) throw new NoCredits("No credits");
  const [match] = await db().insert(matches).values({
    id, ownerKind: "user" as OwnerKind, ownerId: userId, analysisId, ownerName, partnerName,
    partnerToken: randomBytes(24).toString("base64url"), withFamily: input.withFamily === true, source: free ?? "credit",
  }).returning();
  return match;
}

export async function matchesFor(userId: string, analysisId?: string): Promise<Match[]> {
  const where = analysisId ? and(eq(matches.ownerId, userId), eq(matches.analysisId, analysisId)) : eq(matches.ownerId, userId);
  return db().select().from(matches).where(where).orderBy(desc(matches.createdAt));
}

export async function matchFor(userId: string, id: string): Promise<Match | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [m] = await db().select().from(matches).where(and(eq(matches.id, id), eq(matches.ownerId, userId)));
  return m ?? null;
}

export async function matchByToken(token: string): Promise<Match | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [m] = await db().select().from(matches).where(eq(matches.partnerToken, token));
  return m ?? null;
}

/** The partner's recordings, newest first. */
export async function partnerAnalyses(match: Match): Promise<Analysis[]> {
  return (await gateway.listAllFor(partnerOwner(match.id))).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** The partner ticked consent on their link and sent a recording. */
export async function startPartnerRecording(match: Match, input: { audioUrl: unknown; consent: unknown }): Promise<string> {
  if (input.consent !== true) throw new Invalid("Consent is required");
  if (typeof input.audioUrl !== "string" || !/^https:\/\//.test(input.audioUrl)) throw new Invalid("A recording is required");
  const { id } = await gateway.createAnalysis({ audioUrl: input.audioUrl, owner: partnerOwner(match.id) });
  if (!match.partnerConsentAt) await db().update(matches).set({ partnerConsentAt: new Date() }).where(eq(matches.id, match.id));
  return id;
}

/** The partner (or the orderer) removes everything the partner recorded. */
export async function erasePartner(match: Match): Promise<void> {
  for (const a of await partnerAnalyses(match)) await gateway.deleteAnalysis(a.id).catch(() => {});
}

export async function deleteMatch(match: Match): Promise<void> {
  await erasePartner(match);
  await db().delete(matches).where(eq(matches.id, match.id));
}

/** The finished match, or null while the partner hasn't recorded yet. */
export async function buildMatch(match: Match, t: Dict, locale: string): Promise<MatchReport | null> {
  const [own, partner] = await Promise.all([gateway.getAnalysis(match.analysisId), partnerAnalyses(match)]);
  const done = partner.filter((a) => a.status === "completed" && a.psytype?.length);
  if (!own?.psytype?.length || done.length === 0) return null;
  const a = (await profileFor(match.ownerId, own)).psytype ?? own.psytype;
  const b = consensus(done.map((x) => ({ id: x.id, created_at: x.created_at, psytype: x.psytype! })))?.scores ?? done[0].psytype!;
  const fit = matchFit(a, b, { scalesA: own.emostate, scalesB: done[0].emostate, withFamily: match.withFamily });
  return fit ? matchReport(fit, { a: match.ownerName, b: match.partnerName }, t, locale) : null;
}
