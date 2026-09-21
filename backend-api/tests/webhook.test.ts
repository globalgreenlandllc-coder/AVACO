import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAnalysisRoute } from "@/app/api/v1/analyses/[id]/route";
import { POST as createRoute } from "@/app/api/v1/analyses/route";
import { POST as webhookRoute } from "@/app/api/webhooks/avoco/route";
import { analyses, avocoJobs, type AvocoJob, type Db } from "@/lib/db";
import { AUDIO_URL, CALLBACK_SECRET, createTestDb, params, request, setEnv, stubAudioHost } from "./helpers/app";
import { EMO_SCALES, MockAvoco, PSY_TYPES } from "./helpers/mock-avoco";

const mock = new MockAvoco();
let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  await mock.start();
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await mock.stop();
  await close();
});
beforeEach(async () => {
  mock.reset();
  setEnv(mock.url);
  stubAudioHost();
  await db.delete(analyses);
});

const callback = (body: unknown, secret: string | null = CALLBACK_SECRET) =>
  webhookRoute(request("POST", `/api/webhooks/avoco${secret === null ? "" : `?secret=${encodeURIComponent(secret)}`}`, { key: null, body }));

async function startAnalysis(type = "both") {
  const res = await createRoute(request("POST", "/api/v1/analyses", { body: { audio_url: AUDIO_URL, consent: true, type } }));
  const { id } = await res.json();
  const jobs = await db.select().from(avocoJobs).where(eq(avocoJobs.analysisId, id));
  const job = (kind: string) => jobs.find((j) => j.kind === kind) as AvocoJob;
  return { id, psy: job("psytype"), emo: job("emostate") };
}

const fetchAnalysis = async (id: string) => (await getAnalysisRoute(request("GET", "/"), params(id))).json();
const snapshot = async () => ({ analyses: await db.select().from(analyses), jobs: await db.select().from(avocoJobs).orderBy(avocoJobs.id) });

describe("webhook secret", () => {
  it.each([["missing", null], ["wrong", "nope"], ["a prefix", CALLBACK_SECRET.slice(0, 5)], ["empty", ""]])("rejects a %s secret and changes nothing", async (_name, secret) => {
    const { psy } = await startAnalysis();
    const before = await snapshot();
    const res = await callback({ id: psy.id, psy_types: PSY_TYPES }, secret);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized", message: "Invalid callback secret" });
    expect(await snapshot()).toEqual(before);
  });

  it("needs no API key, only the secret", async () => {
    const { psy } = await startAnalysis();
    expect((await callback({ id: psy.id, psy_types: PSY_TYPES })).status).toBe(200);
  });

  it("refuses everything when no secret is configured", async () => {
    const { psy } = await startAnalysis();
    delete process.env.AVOCO_CALLBACK_SECRET;
    expect((await callback({ id: psy.id, psy_types: PSY_TYPES }, "")).status).toBe(500);
  });
});

describe("webhook results", () => {
  it("completes the analysis only once every job has reported", async () => {
    const { id, psy, emo } = await startAnalysis();

    expect(await (await callback({ id: psy.id, psy_types: PSY_TYPES })).json()).toEqual({ ok: true, duplicate: false });
    const half = await fetchAnalysis(id);
    expect(half).toMatchObject({ status: "processing", emostate: null, completed_at: null });
    expect(half.psytype[0]).toEqual({ key: "driver", label: "Driver", value: 68.6, zone: "leading" });

    await callback({ id: emo.id, emo_scales: EMO_SCALES });
    const done = await fetchAnalysis(id);
    expect(done).toMatchObject({ status: "completed", error: null });
    expect(done.completed_at).not.toBeNull();
    expect(done.emostate[0]).toEqual({ key: "self_control", label: "Self-control", value: 84 });

    const [job] = await db.select().from(avocoJobs).where(eq(avocoJobs.id, psy.id));
    expect(job).toMatchObject({ status: "completed", rawResult: { id: psy.id, psy_types: PSY_TYPES } });
  });

  it("is idempotent: a repeated callback changes nothing, even with different data", async () => {
    const { id, psy, emo } = await startAnalysis();
    await callback({ id: psy.id, psy_types: PSY_TYPES });
    await callback({ id: emo.id, emo_scales: EMO_SCALES });
    const before = await snapshot();

    const repeat = await callback({ id: psy.id, psy_types: [{ id: 2, name: "driver", value: 1 }] });
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toEqual({ ok: true, duplicate: true });
    expect(await snapshot()).toEqual(before);
    expect((await fetchAnalysis(id)).psytype[0].value).toBe(68.6);
  });

  it("records a result once when identical callbacks race", async () => {
    const { psy } = await startAnalysis("psytype");
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => callback({ id: psy.id, psy_types: PSY_TYPES }).then((r) => r.json())));
    expect(outcomes.filter((o) => o.duplicate === false)).toHaveLength(1);
  });

  it("is 404 for an unknown job id", async () => {
    for (const id of [crypto.randomUUID(), "not-a-uuid"]) {
      const res = await callback({ id, psy_types: PSY_TYPES });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("not_found");
    }
  });

  it("is 400 without an id or with a broken body", async () => {
    expect((await callback({ psy_types: PSY_TYPES })).status).toBe(400);
    expect((await callback("{broken")).status).toBe(400);
  });

  it("fails the analysis when AVOCO calls back without results", async () => {
    const { id, psy } = await startAnalysis("psytype");
    expect((await callback({ id: psy.id, error: "audio too short" })).status).toBe(200);
    expect(await fetchAnalysis(id)).toMatchObject({ status: "failed", error: "psytype: AVOCO returned no result" });
  });

  it("lets a late result win over a timeout", async () => {
    const { id, psy } = await startAnalysis("psytype");
    await db.update(analyses).set({ createdAt: new Date(Date.now() - 16 * 60_000) }).where(eq(analyses.id, id));
    expect(await fetchAnalysis(id)).toMatchObject({ status: "failed", error: "timeout" });

    await callback({ id: psy.id, psy_types: PSY_TYPES });
    expect(await fetchAnalysis(id)).toMatchObject({ status: "completed", error: null });
  });
});

vi.spyOn(console, "error").mockImplementation(() => {});
