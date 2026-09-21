/**
 * Stored analyses: creating them, running them against AVOCO, and recording results.
 * Every write is a single conditional statement, so concurrent callbacks stay consistent
 * without transactions.
 */
import { and, desc, eq, lt, ne, notExists, or, sql } from "drizzle-orm";
import { avoco, AvocoApiError, type AnalysisKind, type AudioInput, type Channel } from "./avoco";
import { analyses, avocoJobs, db, type Analysis, type AnalysisType } from "./db";
import { formatEmostate, formatPsytype, parseScales } from "./format";
import { describeAvocoError, isUuid, Misconfigured } from "./http";

export const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

export interface NewAnalysis {
  audioUrl: string;
  type: AnalysisType;
  channel?: Channel;
  externalUserId?: string;
}

interface Job { id: string; kind: AnalysisKind }

const kindsOf = (type: AnalysisType): AnalysisKind[] => (type === "both" ? ["psytype", "emostate"] : [type]);

/** Creates the analysis row (processing) and one job row per requested kind. */
export async function createAnalysis(input: NewAnalysis): Promise<{ analysis: Analysis; jobs: Job[] }> {
  const now = new Date();
  const [analysis] = await db().insert(analyses).values({
    id: crypto.randomUUID(),
    externalUserId: input.externalUserId ?? null,
    type: input.type,
    channel: input.channel ?? null,
    audioUrl: input.audioUrl,
    consentAt: now,
    createdAt: now,
  }).returning();

  const jobs = kindsOf(input.type).map((kind) => ({ id: crypto.randomUUID(), kind }));
  await db().insert(avocoJobs).values(jobs.map((j) => ({ ...j, analysisId: analysis.id, createdAt: now })));
  return { analysis, jobs };
}

/** Built from APP_BASE_URL: AVOCO must call the production domain (previews are protected). */
export function callbackUrl(): string {
  const { APP_BASE_URL, VERCEL_PROJECT_PRODUCTION_URL, AVOCO_CALLBACK_SECRET } = process.env;
  const base = APP_BASE_URL || (VERCEL_PROJECT_PRODUCTION_URL ? `https://${VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (!base) throw new Misconfigured("APP_BASE_URL is not configured");
  if (!AVOCO_CALLBACK_SECRET) throw new Misconfigured("AVOCO_CALLBACK_SECRET is not configured");
  return `${base.replace(/\/$/, "")}/api/webhooks/avoco?secret=${encodeURIComponent(AVOCO_CALLBACK_SECRET)}`;
}

/** Async mode: hands every job to AVOCO; results arrive later on the webhook. Throws if any submission fails. */
export async function submitJobs(analysisId: string, jobs: Job[], audio: AudioInput, channel?: Channel): Promise<void> {
  const url = callbackUrl();
  await runJobs(analysisId, jobs, (job) => avoco().submitCallback(job.kind, audio, { id: job.id, callbackUrl: url }, channel));
}

/** Sync mode: waits for AVOCO, stores every result, returns the finished analysis. Throws if any job fails. */
export async function runJobsNow(analysisId: string, jobs: Job[], audio: AudioInput, channel?: Channel): Promise<Analysis> {
  await runJobs(analysisId, jobs, async (job) => {
    const scales = await avoco().analyze(job.kind, audio, channel);
    await recordJobResult(job.id, { id: job.id, [job.kind === "psytype" ? "psy_types" : "emo_scales"]: scales });
  });
  return (await getAnalysis(analysisId))!;
}

/** Runs all jobs in parallel. On any failure the failed jobs and the analysis are marked failed, then the first error is rethrown. */
async function runJobs(analysisId: string, jobs: Job[], run: (job: Job) => Promise<void>): Promise<void> {
  const outcomes = await Promise.allSettled(jobs.map(run));
  const failures = outcomes.flatMap((o, i) => (o.status === "rejected" ? [{ job: jobs[i], reason: o.reason as unknown }] : []));
  if (failures.length === 0) return;

  for (const { job } of failures) await failJob(job.id);
  await failAnalysis(analysisId, failures.map(({ job, reason }) => `${job.kind}: ${errorText(reason)}`).join("; "));
  throw failures[0].reason;
}

function errorText(reason: unknown): string {
  return reason instanceof AvocoApiError ? describeAvocoError(reason).message : "internal error";
}

export type RecordOutcome = "recorded" | "duplicate" | "unknown_job";

/**
 * Records one AVOCO result (from the webhook, or from a sync call). Idempotent: only a job that
 * is still pending can be recorded, so a repeated callback changes nothing.
 */
export async function recordJobResult(jobId: string, payload: unknown): Promise<RecordOutcome> {
  const [job] = await db().select().from(avocoJobs).where(eq(avocoJobs.id, jobId));
  if (!job) return "unknown_job";
  if (job.status !== "pending") return "duplicate";

  const body = (payload ?? {}) as Record<string, unknown>;
  const scales = parseScales(job.kind === "psytype" ? body.psy_types : body.emo_scales);

  // The status guard makes this the single winner if two identical callbacks race.
  const claimed = await db().update(avocoJobs)
    .set({ status: scales ? "completed" : "failed", rawResult: payload, completedAt: new Date() })
    .where(and(eq(avocoJobs.id, jobId), eq(avocoJobs.status, "pending")))
    .returning({ id: avocoJobs.id });
  if (claimed.length === 0) return "duplicate";

  if (!scales) {
    // AVOCO called back without the expected scales: it could not analyse the audio.
    await failAnalysis(job.analysisId, `${job.kind}: AVOCO returned no result`);
    return "recorded";
  }

  await db().update(analyses)
    .set(job.kind === "psytype" ? { psytype: formatPsytype(scales) } : { emostate: formatEmostate(scales) })
    .where(eq(analyses.id, job.analysisId));
  await completeIfDone(job.analysisId);
  return "recorded";
}

/**
 * Marks the analysis completed once no job is left unfinished. A result that arrives after
 * the 15-minute timeout still completes the analysis: the data is real, so it wins over "timeout".
 */
async function completeIfDone(analysisId: string): Promise<void> {
  const unfinished = db().select({ one: sql`1` }).from(avocoJobs)
    .where(and(eq(avocoJobs.analysisId, analysisId), ne(avocoJobs.status, "completed")));

  await db().update(analyses)
    .set({ status: "completed", completedAt: new Date(), error: null })
    .where(and(
      eq(analyses.id, analysisId),
      or(eq(analyses.status, "processing"), and(eq(analyses.status, "failed"), eq(analyses.error, "timeout"))),
      notExists(unfinished),
    ));
}

async function failJob(jobId: string): Promise<void> {
  await db().update(avocoJobs)
    .set({ status: "failed", completedAt: new Date() })
    .where(and(eq(avocoJobs.id, jobId), eq(avocoJobs.status, "pending")));
}

async function failAnalysis(analysisId: string, error: string): Promise<void> {
  await db().update(analyses)
    .set({ status: "failed", error: error.slice(0, 500), completedAt: new Date() })
    .where(and(eq(analyses.id, analysisId), eq(analyses.status, "processing")));
}

/** Anything still processing after 15 minutes is marked failed with error "timeout". */
async function expireStale(id?: string): Promise<void> {
  const cutoff = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  await db().update(analyses)
    .set({ status: "failed", error: "timeout", completedAt: new Date() })
    .where(and(eq(analyses.status, "processing"), lt(analyses.createdAt, cutoff), id ? eq(analyses.id, id) : undefined));
}

export async function getAnalysis(id: string): Promise<Analysis | null> {
  await expireStale(id);
  const [row] = await db().select().from(analyses).where(eq(analyses.id, id));
  return row ?? null;
}

/** History, newest first. The cursor is the (created_at, id) of the last row already seen. */
export async function listAnalyses(opts: { externalUserId?: string; limit: number; cursor?: Cursor }) {
  await expireStale();
  const { cursor } = opts;
  const rows = await db().select().from(analyses)
    .where(and(
      opts.externalUserId !== undefined ? eq(analyses.externalUserId, opts.externalUserId) : undefined,
      cursor && or(
        lt(analyses.createdAt, cursor.createdAt),
        and(eq(analyses.createdAt, cursor.createdAt), lt(analyses.id, cursor.id)),
      ),
    ))
    .orderBy(desc(analyses.createdAt), desc(analyses.id))
    .limit(opts.limit + 1);

  const page = rows.slice(0, opts.limit);
  const last = page.at(-1);
  const nextCursor = rows.length > opts.limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;
  return { page, nextCursor };
}

export async function deleteAnalysisRow(id: string): Promise<void> {
  await db().delete(analyses).where(eq(analyses.id, id)); // jobs go with it (on delete cascade)
}

export interface Cursor { createdAt: Date; id: string }

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`).toString("base64url");
}

export function decodeCursor(raw: string): Cursor | null {
  const [iso, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
  const createdAt = new Date(iso);
  return isUuid(id) && !Number.isNaN(createdAt.getTime()) ? { createdAt, id } : null;
}
