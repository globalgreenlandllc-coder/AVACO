/**
 * Companies on the platform: workspaces, their members, groups, participants and recordings.
 * Every function that reads or changes company data takes the acting user and checks membership
 * first, so access control lives here and not in the pages.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db, groups, members, participants, recordings, workspaces, type Group, type Participant, type Recording, type Role, type Source, type Workspace } from "./db";
import { asWorkspace, balance, charge, getSettings, NoCredits, workspaceTrial } from "./billing";
import { gateway, type Analysis } from "./gateway";
import { isPreset } from "./presets";

export class Forbidden extends Error {}
export class NotFound extends Error {}
export class Invalid extends Error {}
export class LimitReached extends Error {}

const RANK: Record<Role, number> = { viewer: 1, manager: 2, admin: 3 };
const token = (bytes = 24) => randomBytes(bytes).toString("base64url");
const clean = (v: unknown, max: number, what: string): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Invalid(`${what} is required`);
  if (s.length > max) throw new Invalid(`${what} is too long`);
  return s;
};

/** Recordings a workspace may make per calendar month. Protects open links from abuse; raise per plan when billing lands. */
export const monthlyLimit = () => Number(process.env.REPORTS_PER_MONTH_LIMIT) || 200;
export const groupOwner = (groupId: string) => `g:${groupId}`;

// ---------- workspaces and members ----------

export async function createWorkspace(userId: string, input: { name: unknown; industry: unknown }): Promise<Workspace> {
  const name = clean(input.name, 80, "Name");
  const industry = isPreset(input.industry) ? input.industry : "general";
  const [ws] = await db().insert(workspaces).values({ id: crypto.randomUUID(), name, industry, joinCode: token(12), createdBy: userId }).returning();
  await db().insert(members).values({ workspaceId: ws.id, userId, role: "admin" });
  await workspaceTrial(ws.id);
  return ws;
}

export async function myWorkspaces(userId: string): Promise<Array<Workspace & { role: Role }>> {
  const rows = await db().select({ ws: workspaces, role: members.role }).from(members)
    .innerJoin(workspaces, eq(workspaces.id, members.workspaceId))
    .where(eq(members.userId, userId)).orderBy(desc(workspaces.createdAt));
  return rows.map((r) => ({ ...r.ws, role: r.role }));
}

/** The workspace and the user's role in it, or Forbidden. A non-member learns nothing, not even that it exists. */
export async function requireMember(userId: string, workspaceId: string, atLeast: Role = "viewer"): Promise<{ ws: Workspace; role: Role }> {
  const [row] = await db().select({ ws: workspaces, role: members.role }).from(members)
    .innerJoin(workspaces, eq(workspaces.id, members.workspaceId))
    .where(and(eq(members.userId, userId), eq(members.workspaceId, workspaceId)));
  if (!row || RANK[row.role] < RANK[atLeast]) throw new Forbidden("No access to this workspace");
  return row;
}

export async function joinWorkspace(userId: string, code: string): Promise<Workspace> {
  const [ws] = await db().select().from(workspaces).where(eq(workspaces.joinCode, code));
  if (!ws) throw new NotFound("This join link is no longer valid");
  await db().insert(members).values({ workspaceId: ws.id, userId, role: "viewer" }).onConflictDoNothing();
  return ws;
}

export async function listMembers(userId: string, workspaceId: string) {
  await requireMember(userId, workspaceId);
  return db().select().from(members).where(eq(members.workspaceId, workspaceId)).orderBy(members.createdAt);
}

export async function setMemberRole(userId: string, workspaceId: string, targetUserId: string, role: Role | "remove"): Promise<void> {
  await requireMember(userId, workspaceId, "admin");
  if (targetUserId === userId) throw new Invalid("You can't change your own role"); // a workspace always keeps an admin
  const target = and(eq(members.workspaceId, workspaceId), eq(members.userId, targetUserId));
  if (role === "remove") await db().delete(members).where(target);
  else if (role in RANK) await db().update(members).set({ role }).where(target);
  else throw new Invalid("Unknown role");
}

export async function updateWorkspace(userId: string, workspaceId: string, input: { name?: unknown; industry?: unknown; hideEmotions?: unknown; rotateJoinCode?: boolean }): Promise<void> {
  await requireMember(userId, workspaceId, "admin");
  await db().update(workspaces).set({
    ...(input.name !== undefined ? { name: clean(input.name, 80, "Name") } : {}),
    ...(isPreset(input.industry) ? { industry: input.industry } : {}),
    ...(typeof input.hideEmotions === "boolean" ? { hideEmotions: input.hideEmotions } : {}),
    ...(input.rotateJoinCode ? { joinCode: token(12) } : {}),
  }).where(eq(workspaces.id, workspaceId));
}

// ---------- company API keys ----------

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** Creates (or replaces) the workspace API key. The key is returned once; only its hash is kept. */
export async function rotateApiKey(userId: string, workspaceId: string): Promise<string> {
  await requireMember(userId, workspaceId, "admin");
  const key = `avk_${token(32)}`;
  await db().update(workspaces).set({ apiKeyHash: hashKey(key), apiKeyPrefix: key.slice(0, 8) }).where(eq(workspaces.id, workspaceId));
  return key;
}

export async function workspaceForApiKey(key: string | null | undefined): Promise<Workspace | null> {
  if (!key || !key.startsWith("avk_")) return null;
  const [ws] = await db().select().from(workspaces).where(eq(workspaces.apiKeyHash, hashKey(key)));
  return ws ?? null;
}

// ---------- groups ----------

export async function createGroup(userId: string, workspaceId: string, name: unknown): Promise<Group> {
  await requireMember(userId, workspaceId, "manager");
  const [group] = await db().insert(groups).values({ id: crypto.randomUUID(), workspaceId, name: clean(name, 120, "Name"), openToken: token() }).returning();
  return group;
}

export async function listGroups(userId: string, workspaceId: string) {
  await requireMember(userId, workspaceId);
  const rows = await db().select().from(groups).where(eq(groups.workspaceId, workspaceId)).orderBy(desc(groups.createdAt));
  if (rows.length === 0) return [];
  const counts = await db().select({ groupId: participants.groupId, n: count() }).from(participants)
    .where(inArray(participants.groupId, rows.map((g) => g.id))).groupBy(participants.groupId);
  return rows.map((g) => ({ ...g, people: counts.find((c) => c.groupId === g.id)?.n ?? 0 }));
}

async function groupWithWorkspace(groupId: string): Promise<{ group: Group; ws: Workspace } | null> {
  const [row] = await db().select({ group: groups, ws: workspaces }).from(groups)
    .innerJoin(workspaces, eq(workspaces.id, groups.workspaceId)).where(eq(groups.id, groupId));
  return row ?? null;
}

export async function requireGroup(userId: string, groupId: string, atLeast: Role = "viewer") {
  const found = await groupWithWorkspace(groupId);
  if (!found) throw new Forbidden("No access to this group");
  const { role } = await requireMember(userId, found.ws.id, atLeast);
  return { ...found, role };
}

/** For the public open link and station mode. */
export async function groupByOpenToken(openToken: string) {
  const [row] = await db().select({ group: groups, ws: workspaces }).from(groups)
    .innerJoin(workspaces, eq(workspaces.id, groups.workspaceId)).where(eq(groups.openToken, openToken));
  return row ?? null;
}

// ---------- participants and recordings ----------

async function addParticipant(groupId: string, input: { name: unknown; email?: unknown; source: Source }): Promise<Participant> {
  const email = typeof input.email === "string" && input.email.trim() ? clean(input.email, 200, "Email") : null;
  const [p] = await db().insert(participants).values({ id: crypto.randomUUID(), groupId, name: clean(input.name, 120, "Name"), email, token: token(), source: input.source }).returning();
  return p;
}

/** A manager invites a named person; the returned participant's token is their personal link. */
export async function invite(userId: string, groupId: string, input: { name: unknown; email?: unknown }): Promise<Participant> {
  await requireGroup(userId, groupId, "manager");
  return addParticipant(groupId, { ...input, source: "invite" });
}

/** Someone arrives through the group's open link or a station and types their name. */
export async function joinThroughOpenLink(openToken: string, name: unknown, station: boolean): Promise<Participant> {
  const found = await groupByOpenToken(openToken);
  if (!found) throw new NotFound("This link is no longer valid");
  return addParticipant(found.group.id, { name, source: station ? "station" : "open_link" });
}

export async function participantByToken(personToken: string) {
  const [row] = await db().select({ participant: participants, group: groups, ws: workspaces }).from(participants)
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .innerJoin(workspaces, eq(workspaces.id, groups.workspaceId))
    .where(eq(participants.token, personToken));
  return row ?? null;
}

export async function usageThisMonth(workspaceId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [row] = await db().select({ n: count() }).from(recordings)
    .innerJoin(participants, eq(participants.id, recordings.participantId))
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(and(eq(groups.workspaceId, workspaceId), gte(recordings.createdAt, monthStart)));
  return row?.n ?? 0;
}

/**
 * Sends a participant's audio for analysis and records it. `consent` must be literally true:
 * the person's own tick on their link, or the uploader's attestation for uploads and the API.
 */
export async function addRecording(participant: Participant, workspaceId: string, input: { audioUrl: unknown; consent: unknown }): Promise<Recording> {
  if (input.consent !== true) throw new Invalid("Consent is required");
  if (typeof input.audioUrl !== "string") throw new Invalid("audioUrl is required");
  if ((await usageThisMonth(workspaceId)) >= monthlyLimit()) throw new LimitReached("This workspace has reached its monthly limit");

  // The company pays for recordings made for it, never the person recorded.
  const billed = (await getSettings()).enabled;
  if (billed && (await balance(asWorkspace(workspaceId))) < 1) throw new NoCredits("This workspace has no credits left");

  const created = await gateway.createAnalysis({ audioUrl: input.audioUrl, owner: groupOwner(participant.groupId) });
  if (billed) await charge(asWorkspace(workspaceId), created.id);
  const [rec] = await db().insert(recordings).values({ id: crypto.randomUUID(), participantId: participant.id, analysisId: created.id, consentAt: new Date() }).returning();
  return rec;
}

/** A member uploads an existing recording of a named person. */
export async function addUploadedRecording(userId: string, groupId: string, input: { name: unknown; audioUrl: unknown; attest: unknown }, source: Source = "upload"): Promise<{ participant: Participant; recording: Recording }> {
  const { ws } = await requireGroup(userId, groupId, "manager");
  if (input.attest !== true) throw new Invalid("Confirm that the recorded person agreed to this analysis");
  const participant = await addParticipant(groupId, { name: input.name, source });
  const recording = await addRecording(participant, ws.id, { audioUrl: input.audioUrl, consent: true });
  return { participant, recording };
}

export interface PersonRow { participant: Participant; recordings: Recording[]; latest: Analysis | null }

/** Everyone in a group with their recordings and latest analysis: one database read and one gateway list. */
export async function groupPeople(groupId: string): Promise<PersonRow[]> {
  const people = await db().select().from(participants).where(eq(participants.groupId, groupId)).orderBy(desc(participants.createdAt));
  if (people.length === 0) return [];
  const recs = await db().select().from(recordings).where(inArray(recordings.participantId, people.map((p) => p.id))).orderBy(desc(recordings.createdAt));
  const analyses = new Map((await gateway.listAllFor(groupOwner(groupId))).map((a) => [a.id, a]));
  return people.map((participant) => {
    const mine = recs.filter((r) => r.participantId === participant.id);
    return { participant, recordings: mine, latest: mine.length ? analyses.get(mine[0].analysisId) ?? null : null };
  });
}

/** One person's analyses, newest first. Only analyses this platform recorded for them are ever fetched. */
export async function personAnalyses(participantId: string): Promise<Analysis[]> {
  const recs = await db().select().from(recordings).where(eq(recordings.participantId, participantId)).orderBy(desc(recordings.createdAt));
  const found = await Promise.all(recs.map((r) => gateway.getAnalysis(r.analysisId)));
  return found.filter((a): a is Analysis => a !== null);
}

export async function requireParticipant(userId: string, participantId: string, atLeast: Role = "viewer") {
  const [p] = await db().select().from(participants).where(eq(participants.id, participantId));
  if (!p) throw new Forbidden("No access to this person");
  const access = await requireGroup(userId, p.groupId, atLeast);
  return { participant: p, ...access };
}

/** Removes a person with every recording, analysis and audio file. Used by managers and by the person themselves. */
export async function eraseParticipant(participantId: string): Promise<void> {
  const recs = await db().select().from(recordings).where(eq(recordings.participantId, participantId));
  for (const rec of recs) await gateway.deleteAnalysis(rec.analysisId).catch((err) => { if (err?.status !== 404) throw err; });
  await db().delete(participants).where(eq(participants.id, participantId)); // recordings cascade
}

export async function deleteGroup(userId: string, groupId: string): Promise<void> {
  await requireGroup(userId, groupId, "admin");
  const people = await db().select({ id: participants.id }).from(participants).where(eq(participants.groupId, groupId));
  for (const p of people) await eraseParticipant(p.id);
  await db().delete(groups).where(eq(groups.id, groupId));
}

// ---------- the company API (no user: the workspace is identified by its key) ----------

/** Recordings that arrive through the API land in a group called "API", created on first use. */
async function apiGroup(workspaceId: string): Promise<Group> {
  const [existing] = await db().select().from(groups).where(and(eq(groups.workspaceId, workspaceId), eq(groups.name, "API")));
  if (existing) return existing;
  const [created] = await db().insert(groups).values({ id: crypto.randomUUID(), workspaceId, name: "API", openToken: token() }).returning();
  return created;
}

export async function addApiRecording(ws: Workspace, input: { name: unknown; audioUrl: string; consent: unknown }): Promise<{ analysisId: string; participant: Participant }> {
  if (input.consent !== true) throw new Invalid("Field 'consent' must be true: the recorded person has to agree to the analysis");
  const group = await apiGroup(ws.id);
  const participant = await addParticipant(group.id, { name: input.name, source: "api" });
  const recording = await addRecording(participant, ws.id, { audioUrl: input.audioUrl, consent: true });
  return { analysisId: recording.analysisId, participant };
}

/** An analysis, only if one of this workspace's recordings points at it. */
export async function workspaceAnalysis(workspaceId: string, analysisId: string): Promise<{ analysis: Analysis; participant: Participant } | null> {
  const [row] = await db().select({ participant: participants }).from(recordings)
    .innerJoin(participants, eq(participants.id, recordings.participantId))
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(and(eq(recordings.analysisId, analysisId), eq(groups.workspaceId, workspaceId)));
  if (!row) return null;
  const analysis = await gateway.getAnalysis(analysisId);
  return analysis ? { analysis, participant: row.participant } : null;
}
