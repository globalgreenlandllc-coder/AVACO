import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAnalysisRoute, DELETE as deleteAnalysisRoute } from "@/app/api/v1/analyses/[id]/route";
import { GET as listRoute, POST as createRoute } from "@/app/api/v1/analyses/route";
import { POST as analyzeRoute } from "@/app/api/v1/analyze/route";
import { GET as healthRoute } from "@/app/api/v1/health/route";
import { POST as uploadsRoute } from "@/app/api/v1/uploads/route";
import { analyses, avocoJobs, type Db } from "@/lib/db";
import { API_KEY, AUDIO_URL, CALLBACK_SECRET, createTestDb, params, request, setEnv, stubAudioHost } from "./helpers/app";
import { MockAvoco } from "./helpers/mock-avoco";

vi.mock("@vercel/blob", () => ({ del: vi.fn(async () => {}) }));

const mock = new MockAvoco();
let db: Db;
let close: () => Promise<void>;
let downloads: string[];

beforeAll(async () => {
  await mock.start();
  ({ db, close } = await createTestDb());
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(async () => {
  await mock.stop();
  await close();
});
beforeEach(async () => {
  mock.reset();
  setEnv(mock.url);
  downloads = stubAudioHost();
  vi.mocked(del).mockClear();
  await db.delete(analyses);
});

const create = (body: Record<string, unknown>) => createRoute(request("POST", "/api/v1/analyses", { body: { audio_url: AUDIO_URL, consent: true, ...body } }));

describe("API key", () => {
  const routes: Array<[string, (req: Request) => Promise<Response>, string]> = [
    ["GET /health", healthRoute, "GET"],
    ["POST /analyze", analyzeRoute, "POST"],
    ["POST /uploads", uploadsRoute, "POST"],
    ["POST /analyses", createRoute, "POST"],
    ["GET /analyses", listRoute, "GET"],
    ["GET /analyses/:id", (req) => getAnalysisRoute(req, params(crypto.randomUUID())), "GET"],
    ["DELETE /analyses/:id", (req) => deleteAnalysisRoute(req, params(crypto.randomUUID())), "DELETE"],
  ];

  it.each(routes)("%s rejects a missing key", async (_name, route, method) => {
    const res = await route(request(method, "/", { key: null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized", message: "Missing API key" });
  });

  it.each(routes)("%s rejects a wrong key", async (_name, route, method) => {
    const res = await route(request(method, "/", { key: API_KEY.slice(0, -1) + "X" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("rejects a key that is only a prefix of a real one", async () => {
    expect((await healthRoute(request("GET", "/", { key: API_KEY.slice(0, 8) }))).status).toBe(401);
  });

  it("accepts Bearer and x-api-key, for any configured key", async () => {
    expect((await healthRoute(request("GET", "/"))).status).toBe(200);
    expect((await healthRoute(request("GET", "/", { key: null, headers: { "x-api-key": "other-key" } }))).status).toBe(200);
  });
});

describe("GET /api/v1/health", () => {
  it("is ok after a successful AVOCO login", async () => {
    const res = await healthRoute(request("GET", "/api/v1/health"));
    expect(await res.json()).toEqual({ status: "ok", avoco: "connected" });
  });

  it("is 502 when AVOCO login fails", async () => {
    mock.loginFails = true;
    expect((await healthRoute(request("GET", "/api/v1/health"))).status).toBe(502);
  });
});

describe("POST /api/v1/analyses — validation", () => {
  it.each([[undefined], [false], ["true"], [1], [null]])("requires consent to be exactly true (got %j)", async (consent) => {
    const res = await create({ consent });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
    expect(await db.select().from(analyses)).toHaveLength(0);
    expect(downloads).toHaveLength(0);
  });

  it.each([
    ["another host", "https://evil.example.com/a.m4a"],
    ["cloud metadata", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost/a.m4a"],
    ["a lookalike suffix", "https://blob.vercel-storage.com.evil.com/a.m4a"],
    ["the allowed host as a prefix", "https://evilblob.vercel-storage.com.attacker.io/a.m4a"],
    ["credentials that hide the real host", "https://x.public.blob.vercel-storage.com@evil.com/a.m4a"],
    ["plain http", "http://store123.public.blob.vercel-storage.com/a.m4a"],
    ["a non-http scheme", "file:///etc/passwd"],
    ["garbage", "not a url"],
  ])("blocks %s (SSRF)", async (_name, audio_url) => {
    const res = await create({ audio_url });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad_request");
    expect(downloads).toHaveLength(0); // never fetched
    expect(await db.select().from(analyses)).toHaveLength(0);
  });

  it("honours ALLOWED_AUDIO_HOSTS, exact and dotted", async () => {
    process.env.ALLOWED_AUDIO_HOSTS = "cdn.example.com, .s3.amazonaws.com";
    expect((await create({ audio_url: AUDIO_URL })).status).toBe(400);
    expect((await create({ audio_url: "https://sub.cdn.example.com/a.m4a" })).status).toBe(400);
    expect(downloads).toHaveLength(0);

    // Allowed hosts get as far as the download (which the stub then refuses).
    await create({ audio_url: "https://cdn.example.com/a.m4a" });
    await create({ audio_url: "https://bucket.s3.amazonaws.com/a.m4a" });
    expect(downloads).toEqual(["https://cdn.example.com/a.m4a", "https://bucket.s3.amazonaws.com/a.m4a"]);
  });

  it.each([[{ type: "everything" }], [{ channel: 2 }], [{ mode: "later" }], [{ external_user_id: 42 }]])("rejects %j", async (bad) => {
    expect((await create(bad)).status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    expect((await createRoute(request("POST", "/api/v1/analyses", { body: "{oops" }))).status).toBe(400);
  });
});

describe("POST /api/v1/analyses — async", () => {
  it("stores the analysis and hands one job per kind to AVOCO", async () => {
    const res = await create({ external_user_id: "user-1", channel: 1 });
    expect(res.status).toBe(202);
    const { id, status } = await res.json();
    expect(status).toBe("processing");

    const [row] = await db.select().from(analyses).where(eq(analyses.id, id));
    expect(row).toMatchObject({ externalUserId: "user-1", type: "both", channel: 1, audioUrl: AUDIO_URL, status: "processing" });
    expect(row.consentAt).toBeInstanceOf(Date);

    const jobs = await db.select().from(avocoJobs).where(eq(avocoJobs.analysisId, id));
    expect(jobs.map((j) => j.kind).sort()).toEqual(["emostate", "psytype"]);

    expect(mock.analyzeCalls.map((c) => c.path).sort()).toEqual(["/api/v2/analyze/emostate/callback", "/api/v2/analyze/psytype/callback"]);
    for (const call of mock.analyzeCalls) {
      expect(call.channel).toBe("1");
      expect(call.fileBytes).toBe(2048);
      expect(call.fields.callback_url).toBe(`https://gateway.example.com/api/webhooks/avoco?secret=${CALLBACK_SECRET}`);
      expect(jobs.map((j) => j.id)).toContain(call.fields.id);
    }
  });

  it("creates a single job for a single type", async () => {
    const { id } = await (await create({ type: "emostate" })).json();
    expect(await db.select().from(avocoJobs).where(eq(avocoJobs.analysisId, id))).toHaveLength(1);
  });

  it("is 422 analysis_failed when AVOCO rejects the audio, and the analysis is marked failed", async () => {
    mock.analyzeError = { status: 400, body: { detail: "Audio is shorter than 30 seconds" } };
    const res = await create({ type: "psytype" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ error: "analysis_failed", message: "Audio is shorter than 30 seconds" });

    const [row] = await db.select().from(analyses).where(eq(analyses.id, body.analysis_id));
    expect(row).toMatchObject({ status: "failed", error: "psytype: Audio is shorter than 30 seconds" });
  });

  it("is 502 upstream_error when AVOCO is down, without leaking the upstream body", async () => {
    mock.analyzeError = { status: 500, body: { detail: "Traceback: secret internals" } };
    const res = await create({});
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text).error).toBe("upstream_error");
    expect(text).not.toContain("Traceback");
  });

  it("is 500 server_misconfigured, storing nothing, when the callback secret is missing", async () => {
    delete process.env.AVOCO_CALLBACK_SECRET;
    expect((await create({})).status).toBe(500);
    expect(await db.select().from(analyses)).toHaveLength(0);
  });
});

describe("POST /api/v1/analyses — sync", () => {
  it("returns the full formatted analysis and stores it", async () => {
    const res = await create({ mode: "sync", external_user_id: "user-2" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "completed", type: "both", external_user_id: "user-2", error: null });
    expect(body.completed_at).not.toBeNull();
    expect(body.psytype).toEqual([
      { key: "driver", label: "Driver", value: 68.6, zone: "leading" },
      { key: "organizer", label: "Organizer", value: 50, zone: "active" },
      { key: "brand_new_type", label: "brand_new_type", value: 30, zone: "active" },
      { key: "analyst", label: "Analyst", value: 12.3, zone: "background" },
    ]);
    expect(body.emostate.map((s: { key: string; value: number }) => [s.key, s.value])).toEqual([["self_control", 84], ["energy_level", 41], ["brand_new_scale", 6]]);

    const jobs = await db.select().from(avocoJobs).where(eq(avocoJobs.analysisId, body.id));
    expect(jobs.every((j) => j.status === "completed" && j.rawResult !== null)).toBe(true);

    const fetched = await getAnalysisRoute(request("GET", `/api/v1/analyses/${body.id}`), params(body.id));
    expect(await fetched.json()).toEqual(body);
  });

  it("leaves the other result null for a single type", async () => {
    const body = await (await create({ mode: "sync", type: "psytype" })).json();
    expect(body).toMatchObject({ status: "completed", emostate: null });
    expect(body.psytype).toHaveLength(4);
  });

  it("is 422 and stores the failure when AVOCO rejects the audio", async () => {
    mock.analyzeError = { status: 415, body: { detail: "Unsupported format" } };
    const res = await create({ mode: "sync" });
    expect(res.status).toBe(422);
    const { analysis_id } = await res.json();
    const stored = await (await getAnalysisRoute(request("GET", "/"), params(analysis_id))).json();
    expect(stored).toMatchObject({ status: "failed", psytype: null, emostate: null });
    expect(stored.error).toContain("Unsupported format");
  });
});

describe("GET /api/v1/analyses/:id", () => {
  it("is 404 for an unknown or malformed id", async () => {
    for (const id of [crypto.randomUUID(), "not-a-uuid", "1; drop table analyses"]) {
      const res = await getAnalysisRoute(request("GET", "/"), params(id));
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("not_found");
    }
  });

  it("marks an analysis failed with 'timeout' after 15 minutes of processing", async () => {
    const { id } = await (await create({})).json();
    const fresh = await (await getAnalysisRoute(request("GET", "/"), params(id))).json();
    expect(fresh).toMatchObject({ status: "processing", error: null, completed_at: null });

    await db.update(analyses).set({ createdAt: new Date(Date.now() - 16 * 60_000) }).where(eq(analyses.id, id));
    const stale = await (await getAnalysisRoute(request("GET", "/"), params(id))).json();
    expect(stale).toMatchObject({ status: "failed", error: "timeout" });
    expect(stale.completed_at).not.toBeNull();
  });
});

describe("GET /api/v1/analyses", () => {
  it("pages through history newest first, filtered by user", async () => {
    const base = Date.now() - 60_000;
    const rows = Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(), externalUserId: i === 2 ? "someone-else" : "user-9", type: "both" as const,
      audioUrl: AUDIO_URL, consentAt: new Date(), status: "completed" as const,
      createdAt: new Date(base + (i === 4 ? 3 : i) * 1000), // rows 3 and 4 share a timestamp
    }));
    await db.insert(analyses).values(rows);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const path: string = `/api/v1/analyses?external_user_id=user-9&limit=1${cursor ? `&cursor=${cursor}` : ""}`;
      const body = await (await listRoute(request("GET", path))).json();
      expect(body.data.length).toBeLessThanOrEqual(1);
      seen.push(...body.data.map((a: { id: string }) => a.id));
      cursor = body.next_cursor;
      pages++;
    } while (cursor && pages < 10);

    const mine = rows.filter((r) => r.externalUserId === "user-9");
    expect(new Set(seen)).toEqual(new Set(mine.map((r) => r.id)));
    expect(seen).toHaveLength(4); // no duplicates or gaps, even across the shared timestamp
    expect(seen.at(-1)).toBe(rows[0].id); // oldest last
    expect(seen.slice(0, 2).sort()).toEqual([rows[3].id, rows[4].id].sort());
  });

  it("defaults to 20 and returns everything without a user filter", async () => {
    const body = await (await listRoute(request("GET", "/api/v1/analyses"))).json();
    expect(body).toEqual({ data: [], next_cursor: null });
  });

  it.each(["limit=0", "limit=101", "limit=abc", "cursor=garbage"])("rejects %s", async (query) => {
    expect((await listRoute(request("GET", `/api/v1/analyses?${query}`))).status).toBe(400);
  });
});

describe("DELETE /api/v1/analyses/:id", () => {
  it("deletes the analysis, its jobs and its audio file", async () => {
    const { id } = await (await create({})).json();
    const res = await deleteAnalysisRoute(request("DELETE", "/"), params(id));
    expect(await res.json()).toEqual({ id, deleted: true, audio_deleted: true });

    expect(del).toHaveBeenCalledWith(AUDIO_URL);
    expect(await db.select().from(analyses)).toHaveLength(0);
    expect(await db.select().from(avocoJobs)).toHaveLength(0);
    expect((await getAnalysisRoute(request("GET", "/"), params(id))).status).toBe(404);
  });

  it("keeps the record when the audio can't be deleted, so the caller can retry", async () => {
    const { id } = await (await create({})).json();
    vi.mocked(del).mockRejectedValueOnce(new Error("blob down"));
    const res = await deleteAnalysisRoute(request("DELETE", "/"), params(id));
    expect(res.status).toBe(502);
    expect(await db.select().from(analyses)).toHaveLength(1);
  });

  it("is 404 for an unknown id", async () => {
    expect((await deleteAnalysisRoute(request("DELETE", "/"), params(crypto.randomUUID()))).status).toBe(404);
  });
});

describe("POST /api/v1/analyze (stateless, unchanged)", () => {
  it("still analyses without touching the database", async () => {
    const res = await analyzeRoute(request("POST", "/api/v1/analyze", { body: { audio_url: AUDIO_URL, type: "psytype" } }));
    const body = await res.json();
    expect(body).toMatchObject({ type: "psytype" });
    expect(body.psytype[0]).toEqual({ key: "driver", label: "Driver", value: 68.6, zone: "leading" });
    expect(await db.select().from(analyses)).toHaveLength(0);
  });

  it("applies the same SSRF block", async () => {
    const res = await analyzeRoute(request("POST", "/api/v1/analyze", { body: { audio_url: "https://evil.example.com/a.m4a" } }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/uploads", () => {
  it("rejects anything that isn't a token request", async () => {
    const res = await uploadsRoute(request("POST", "/api/v1/uploads", { body: { type: "blob.upload-completed", payload: {} } }));
    expect(res.status).toBe(400);
  });
});
