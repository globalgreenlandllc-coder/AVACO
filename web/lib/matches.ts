/**
 * Relationship matches: ordering, the partner's private link, their recordings and the finished report.
 * The orderer's profile is their consensus across recordings (lib/profile.ts); the partner's is the consensus
 * across the recordings made on their link, filed in the gateway under "m:<matchId>". Server only.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { asUser, chargeMatch, matchIsFree } from "./billing";
import { matchCredits, startMatchPurchase } from "./match-billing";
import { consensus } from "./consensus";
import { db, matches, type OwnerKind } from "./db";
import { gateway, type Analysis } from "./gateway";
import type { Dict } from "./i18n";
import { matchFit } from "./match";
import { isMatchKind } from "./match-kind";
import { matchReport, type MatchReport } from "./match-report";
import { profileFor } from "./profile";
import { Invalid, NotFound } from "./workspaces";

export type Match = typeof matches.$inferSelect;
export const partnerOwner = (matchId: string) => `m:${matchId}`;
const clean = (v: unknown, max: number, what: string) => { const s = typeof v === "string" ? v.trim() : ""; if (!s || s.length > max) throw new Invalid(`${what} is required (up to ${max} characters)`); return s; };

/**
 * Orders a match from one of the person's own completed reports. Free for admins, on the open host and while billing
 * is off; otherwise paid with report credits when the person has enough, else with the card: the match is created
 * unpaid and a purchase is returned for the Stripe Checkout (lib/match-billing.ts), and the partner's link stays
 * closed until the payment lands.
 */
export async function createMatch(userId: string, input: { analysisId: unknown; ownerName: unknown; partnerName: unknown; withFamily?: unknown; kind?: unknown }): Promise<{ match: Match; purchase: Awaited<ReturnType<typeof startMatchPurchase>> | null; reused?: boolean }> {
  const analysisId = typeof input.analysisId === "string" ? input.analysisId : "";
  const analysis = analysisId ? await gateway.getAnalysisFor(userId, analysisId) : null;
  if (!analysis || analysis.status !== "completed" || !analysis.psytype?.length) throw new NotFound("Report not found");
  const ownerName = clean(input.ownerName, 60, "Your name"), partnerName = clean(input.partnerName, 60, "Partner's name");
  const kind = isMatchKind(input.kind) ? input.kind : "couple";

  // The same couple ordered again from the same report, while the first one isn't finished: reopen it, never charge twice.
  // (Unpaid: a fresh checkout for that same match. Finished ones may be ordered again: a new recording, a new reading.)
  const same = (await matchesFor(userId, analysisId)).filter((m) => m.partnerName.trim().toLowerCase() === partnerName.toLowerCase());
  for (const m of same) {
    const partner = await partnerAnalyses(m).catch(() => []);
    if (partner.some((a) => a.status === "completed")) continue;
    return { match: m, purchase: isPaid(m) ? null : await startMatchPurchase(asUser(userId), analysisId, m.id), reused: true };
  }

  const id = crypto.randomUUID();
  const free = await matchIsFree(userId);
  const byCredits = !free && (await chargeMatch(asUser(userId), id, await matchCredits()));
  const paid = Boolean(free) || byCredits;
  const [match] = await db().insert(matches).values({
    id, ownerKind: "user" as OwnerKind, ownerId: userId, analysisId, ownerName, partnerName,
    partnerToken: randomBytes(24).toString("base64url"), withFamily: input.withFamily === true, kind, source: free ?? "credit", paidAt: paid ? new Date() : null,
  }).returning();
  return { match, purchase: paid ? null : await startMatchPurchase(asUser(userId), analysisId, id) };
}

/** Paid: the payment landed, or none was ever needed (made by an admin, or while billing was off). */
export const isPaid = (m: Pick<Match, "paidAt" | "source">): boolean => m.paidAt !== null || m.source === "admin" || m.source === "free";

export async function matchesFor(userId: string, analysisId?: string): Promise<Match[]> {
  const where = analysisId ? and(eq(matches.ownerId, userId), eq(matches.analysisId, analysisId)) : eq(matches.ownerId, userId);
  return db().select().from(matches).where(where).orderBy(desc(matches.createdAt));
}

export async function matchFor(userId: string, id: string): Promise<Match | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [m] = await db().select().from(matches).where(and(eq(matches.id, id), eq(matches.ownerId, userId)));
  return m ?? null;
}

/** The partner's link: only a paid-for match answers to it. */
export async function matchByToken(token: string): Promise<Match | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [m] = await db().select().from(matches).where(eq(matches.partnerToken, token));
  return m && isPaid(m) ? m : null;
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

/** The partner opened their link (first time only), or pressed record / chose a file. */
export async function notePartnerOpened(match: Match): Promise<void> {
  if (!match.partnerOpenedAt) await db().update(matches).set({ partnerOpenedAt: new Date() }).where(eq(matches.id, match.id));
}
export async function notePartnerStarted(match: Match): Promise<void> {
  if (!match.partnerStartedAt) await db().update(matches).set({ partnerStartedAt: new Date(), partnerOpenedAt: match.partnerOpenedAt ?? new Date() }).where(eq(matches.id, match.id));
}

/** The partner (or the orderer) removes everything the partner recorded. */
export async function erasePartner(match: Match): Promise<void> {
  for (const a of await partnerAnalyses(match)) await gateway.deleteAnalysis(a.id).catch(() => {});
}

export async function deleteMatch(match: Match): Promise<void> {
  await erasePartner(match);
  await db().delete(matches).where(eq(matches.id, match.id));
}

/** The couple's report exists: remembered once, so the orderer can be told wherever they are (unseenReadyMatches). */
export async function markReady(match: Match): Promise<void> {
  if (!match.readyAt) await db().update(matches).set({ readyAt: new Date() }).where(and(eq(matches.id, match.id), isNull(matches.readyAt)));
}

/** The orderer has opened the finished report; the notice goes away. */
export async function markSeen(match: Match): Promise<void> {
  if (!match.ownerSeenAt) await db().update(matches).set({ ownerSeenAt: new Date() }).where(eq(matches.id, match.id));
}

/** Finished matches the orderer has not opened yet: the notice at the top of every page. One cheap query, no gateway. */
export async function unseenReadyMatches(userId: string): Promise<Match[]> {
  return db().select().from(matches).where(and(eq(matches.ownerId, userId), isNotNull(matches.readyAt), isNull(matches.ownerSeenAt))).orderBy(desc(matches.readyAt));
}

/** The finished match, or null while the partner hasn't recorded yet. */
export async function buildMatch(match: Match, t: Dict, locale: string): Promise<MatchReport | null> {
  const [own, partner] = await Promise.all([gateway.getAnalysis(match.analysisId), partnerAnalyses(match)]);
  const done = partner.filter((a) => a.status === "completed" && a.psytype?.length);
  if (!own?.psytype?.length || done.length === 0) return null;
  const a = (await profileFor(match.ownerId, own)).psytype ?? own.psytype;
  const b = consensus(done.map((x) => ({ id: x.id, created_at: x.created_at, psytype: x.psytype! })))?.scores ?? done[0].psytype!;
  const fit = matchFit(a, b, { scalesA: own.emostate, scalesB: done[0].emostate, withFamily: match.withFamily, kind: match.kind });
  if (fit) await markReady(match);
  return fit ? matchReport(fit, { a: match.ownerName, b: match.partnerName }, t, locale, match.kind) : null;
}
