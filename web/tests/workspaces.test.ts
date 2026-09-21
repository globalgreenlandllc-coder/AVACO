import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A fake gateway: remembers what was created and deleted.
const gw = vi.hoisted(() => ({ created: [] as Array<{ id: string; owner: string; audioUrl: string }>, deleted: [] as string[] }));
vi.mock("@/lib/gateway", () => ({
  gateway: {
    createAnalysis: vi.fn(async (input: { audioUrl: string; owner: string }) => { const id = crypto.randomUUID(); gw.created.push({ id, ...input }); return { id, status: "processing" }; }),
    listAllFor: vi.fn(async (owner: string) => gw.created.filter((a) => a.owner === owner && !gw.deleted.includes(a.id)).map((a) => ({ id: a.id, status: "completed", external_user_id: a.owner }))),
    getAnalysis: vi.fn(async (id: string) => (gw.created.some((a) => a.id === id) && !gw.deleted.includes(id) ? { id, status: "completed" } : null)),
    deleteAnalysis: vi.fn(async (id: string) => { gw.deleted.push(id); return { deleted: true }; }),
  },
}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as W from "@/lib/workspaces";

let client: PGlite;
let db: Db;
const AUDIO = "https://x.public.blob.vercel-storage.com/a.wav";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  await db.delete(schema.workspaces);
  gw.created.length = 0; gw.deleted.length = 0;
  delete process.env.REPORTS_PER_MONTH_LIMIT;
});

async function company(owner = "user_owner") {
  const ws = await W.createWorkspace(owner, { name: "Acme", industry: "hiring" });
  const group = await W.createGroup(owner, ws.id, "Sales manager vacancy");
  return { ws, group };
}

describe("workspaces and roles", () => {
  it("makes the creator an admin and lists only a user's own workspaces", async () => {
    const { ws } = await company();
    await W.createWorkspace("user_other", { name: "Other Co", industry: "nonsense" });
    expect((await W.myWorkspaces("user_owner")).map((w) => [w.name, w.role, w.industry])).toEqual([["Acme", "admin", "hiring"]]);
    expect((await W.myWorkspaces("user_other"))[0].industry).toBe("general"); // unknown preset falls back
    expect(ws.joinCode.length).toBeGreaterThanOrEqual(16);
  });

  it("gives a non-member nothing", async () => {
    const { ws, group } = await company();
    await expect(W.requireMember("stranger", ws.id)).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.listGroups("stranger", ws.id)).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.requireGroup("stranger", group.id)).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.invite("stranger", group.id, { name: "X" })).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.requireGroup("user_owner", crypto.randomUUID())).rejects.toBeInstanceOf(W.Forbidden);
  });

  it("lets a join link add viewers, who can look but not change anything", async () => {
    const { ws, group } = await company();
    await W.joinWorkspace("user_viewer", ws.joinCode);
    await W.joinWorkspace("user_viewer", ws.joinCode); // joining twice is harmless
    expect(await W.listMembers("user_owner", ws.id)).toHaveLength(2);
    expect((await W.requireGroup("user_viewer", group.id)).role).toBe("viewer");
    await expect(W.invite("user_viewer", group.id, { name: "X" })).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.createGroup("user_viewer", ws.id, "G")).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.rotateApiKey("user_viewer", ws.id)).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.joinWorkspace("u", "wrong-code")).rejects.toBeInstanceOf(W.NotFound);
  });

  it("lets an admin promote and remove members, but never themselves", async () => {
    const { ws, group } = await company();
    await W.joinWorkspace("user_b", ws.joinCode);
    await W.setMemberRole("user_owner", ws.id, "user_b", "manager");
    await expect(W.invite("user_b", group.id, { name: "Dana" })).resolves.toMatchObject({ name: "Dana" });
    await expect(W.setMemberRole("user_b", ws.id, "user_owner", "viewer")).rejects.toBeInstanceOf(W.Forbidden);
    await expect(W.setMemberRole("user_owner", ws.id, "user_owner", "viewer")).rejects.toBeInstanceOf(W.Invalid);
    await W.setMemberRole("user_owner", ws.id, "user_b", "remove");
    await expect(W.requireMember("user_b", ws.id)).rejects.toBeInstanceOf(W.Forbidden);
  });

  it("rotating the join code invalidates the old link", async () => {
    const { ws } = await company();
    await W.updateWorkspace("user_owner", ws.id, { rotateJoinCode: true, hideEmotions: true, name: "Acme 2" });
    await expect(W.joinWorkspace("late", ws.joinCode)).rejects.toBeInstanceOf(W.NotFound);
    expect((await W.myWorkspaces("user_owner"))[0]).toMatchObject({ name: "Acme 2", hideEmotions: true });
  });
});

describe("people and recordings", () => {
  it("invites a person, records through their private link, and files the analysis under the group", async () => {
    const { ws, group } = await company();
    const person = await W.invite("user_owner", group.id, { name: " Dana Lee ", email: "dana@example.com" });
    expect(person).toMatchObject({ name: "Dana Lee", email: "dana@example.com", source: "invite" });

    const found = await W.participantByToken(person.token);
    expect(found).toMatchObject({ participant: { id: person.id }, group: { id: group.id }, ws: { id: ws.id } });
    expect(await W.participantByToken("guess")).toBeNull();

    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    expect(gw.created).toEqual([expect.objectContaining({ owner: `g:${group.id}`, audioUrl: AUDIO })]);

    const [row] = await W.groupPeople(group.id);
    expect(row).toMatchObject({ participant: { name: "Dana Lee" }, latest: { id: gw.created[0].id } });
    expect(row.recordings).toHaveLength(1);
  });

  it.each([[undefined], [false], ["true"], [1]])("refuses a recording without consent (%j)", async (consent) => {
    const { ws, group } = await company();
    const person = await W.invite("user_owner", group.id, { name: "Dana" });
    await expect(W.addRecording(person, ws.id, { audioUrl: AUDIO, consent })).rejects.toBeInstanceOf(W.Invalid);
    expect(gw.created).toHaveLength(0);
  });

  it("an open link and a station add people by name; a wrong link adds no one", async () => {
    const { group } = await company();
    expect(await W.joinThroughOpenLink(group.openToken, "Walk-in", false)).toMatchObject({ source: "open_link" });
    expect(await W.joinThroughOpenLink(group.openToken, "At the desk", true)).toMatchObject({ source: "station" });
    await expect(W.joinThroughOpenLink("nope", "X", false)).rejects.toBeInstanceOf(W.NotFound);
    await expect(W.joinThroughOpenLink(group.openToken, "   ", false)).rejects.toBeInstanceOf(W.Invalid);
  });

  it("an uploaded recording needs the uploader's attestation", async () => {
    const { group } = await company();
    await expect(W.addUploadedRecording("user_owner", group.id, { name: "Call 17", audioUrl: AUDIO, attest: false })).rejects.toBeInstanceOf(W.Invalid);
    const { participant } = await W.addUploadedRecording("user_owner", group.id, { name: "Call 17", audioUrl: AUDIO, attest: true });
    expect(participant.source).toBe("upload");
    expect(await W.groupPeople(group.id)).toHaveLength(1); // the refused upload left no one behind
  });

  it("stops at the monthly limit", async () => {
    process.env.REPORTS_PER_MONTH_LIMIT = "2";
    const { ws, group } = await company();
    const person = await W.invite("user_owner", group.id, { name: "Dana" });
    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    await expect(W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true })).rejects.toBeInstanceOf(W.LimitReached);
    expect(await W.usageThisMonth(ws.id)).toBe(2);
    expect((await W.personAnalyses(person.id))).toHaveLength(2);
  });

  it("erasing a person deletes every analysis and audio file in the gateway", async () => {
    const { ws, group } = await company();
    const person = await W.invite("user_owner", group.id, { name: "Dana" });
    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    await W.eraseParticipant(person.id);
    expect(gw.deleted.sort()).toEqual(gw.created.map((a) => a.id).sort());
    expect(await W.groupPeople(group.id)).toEqual([]);
    expect(await db.select().from(schema.recordings)).toEqual([]);
  });

  it("deleting a group erases everyone in it, and only an admin may", async () => {
    const { ws, group } = await company();
    await W.joinWorkspace("user_b", ws.joinCode);
    await W.setMemberRole("user_owner", ws.id, "user_b", "manager");
    const person = await W.invite("user_b", group.id, { name: "Dana" });
    await W.addRecording(person, ws.id, { audioUrl: AUDIO, consent: true });
    await expect(W.deleteGroup("user_b", group.id)).rejects.toBeInstanceOf(W.Forbidden);
    await W.deleteGroup("user_owner", group.id);
    expect(gw.deleted).toHaveLength(1);
    expect(await W.listGroups("user_owner", ws.id)).toEqual([]);
  });
});

describe("company API keys", () => {
  it("shows the key once, stores only a hash, and a new key replaces the old one", async () => {
    const { ws } = await company();
    const key = await W.rotateApiKey("user_owner", ws.id);
    expect(key).toMatch(/^avk_/);
    const [stored] = await db.select().from(schema.workspaces);
    expect(JSON.stringify(stored)).not.toContain(key);
    expect(stored.apiKeyPrefix).toBe(key.slice(0, 8));

    expect((await W.workspaceForApiKey(key))?.id).toBe(ws.id);
    expect(await W.workspaceForApiKey("avk_wrong")).toBeNull();
    expect(await W.workspaceForApiKey(null)).toBeNull();

    const next = await W.rotateApiKey("user_owner", ws.id);
    expect(await W.workspaceForApiKey(key)).toBeNull();
    expect((await W.workspaceForApiKey(next))?.id).toBe(ws.id);
  });
});
