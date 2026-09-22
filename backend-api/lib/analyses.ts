/**
 * Stored analyses: creating them, running them against AVOCO, and recording results.
 * Every write is a single conditional statement, so concurrent callbacks stay consistent
 * without transactions.
 */
import { and, desc, eq, inArray, lt, ne, notExists, or, sql } from "drizzle-orm";
import { avoco, AvocoApiError, type AnalysisKind, type AudioInput, type Channel } from "./avoco";
import { analyses, avocoJobs, db, type Analysis, type AnalysisType } from "./db";
import { formatEmostate, formatPsytype, parseScales } from "./format";
import { downloadAudio } from "./audio";
import { describeAvocoError, isUuid, Misconfigured } from "./http";

export const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;
/** A queued recording is retried this often, for this long, before it is given up on. */
export const RETRY_EVERY_MS = 45 * 1000;
export const QUEUE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

/**
 * Async mode: hands every job to AVOCO; results arrive later on the webhook.
 * If AVOCO is down (5xx or unreachable) the analysis is queued and retried later (see retryQueued);
 * any other failure (a rejected file) fails it. Returns the resulting status.
 */
export async function submitJobs(analysisId: string, jobs: Job[], audio: AudioInput, channel?: Channel): Promise<"processing" | "queued"> {
  const url = callbackUrl();
  const outcomes = await Promise.allSettled(jobs.map((job) => avoco().submitCallback(job.kind, audio, { id: job.id, callbackUrl: url }, channel)));
  await db().update(analyses).set({ attempts: sql`${analyses.attempts} + 1`, lastAttemptAt: new Date() }).where(eq(analyses.id, analysisId));
  const accepted = jobs.filter((_, i) => outcomes[i].status === "fulfilled").map((j) => j.id);
  if (accepted.length > 0) await db().update(avocoJobs).set({ submittedAt: new Date() }).where(inArray(avocoJobs.id, accepted));

  const failures = outcomes.flatMap((o, i) => (o.status === "rejected" ? [{ job: jobs[i], reason: o.reason as unknown }] : []));
  if (failures.length === 0) {
    await db().update(analyses).set({ status: "processing", error: null }).where(and(eq(analyses.id, analysisId), eq(analyses.status, "queued")));
    return "processing";
  }

  // Jobs that did get through will report on the webhook; a retry only resends the ones that didn't.
  const outage = failures.every(({ reason }) => reason instanceof AvocoApiError && (reason.status === 0 || reason.status >= 500));
  if (outage) {
    await db().update(analyses).set({ status: "queued", error: null }).where(and(eq(analyses.id, analysisId), inArray(analyses.status, ["processing", "queued"])));
    return "queued";
  }
  for (const { job } of failures) await failJob(job.id);
  await failAnalysis(analysisId, failures.map(({ job, reason }) => `${job.kind}: ${errorText(reason)}`).join("; "));
  throw failures[0].reason;
}

/**
 * Tries again to submit queued analyses whose last attempt is old enough. Called whenever an analysis is
 * read, so a person waiting on their report drives the retries; nothing else has to be scheduled.
 * Only jobs AVOCO never accepted are resent; an accepted job is waiting for its webhook.
 */
export async function retryQueued(id?: string, limit = 3): Promise<void> {
  const due = new Date(Date.now() - RETRY_EVERY_MS);
  const rows = await db().select().from(analyses)
    .where(and(eq(analyses.status, "queued"), or(lt(analyses.lastAttemptAt, due), sql`${analyses.lastAttemptAt} is null`), id ? eq(analyses.id, id) : undefined))
    .orderBy(analyses.createdAt).limit(limit);

  for (const row of rows) {
    // Claim it for this attempt, so two readers at once don't both resend.
    const claimed = await db().update(analyses).set({ lastAttemptAt: new Date() })
      .where(and(eq(analyses.id, row.id), eq(analyses.status, "queued"), or(lt(analyses.lastAttemptAt, due), sql`${analyses.lastAttemptAt} is null`)))
      .returning({ id: analyses.id });
    if (claimed.length === 0) continue;

    const pending = await db().select().from(avocoJobs).where(and(eq(avocoJobs.analysisId, row.id), eq(avocoJobs.status, "pending"), sql`${avocoJobs.submittedAt} is null`));
    try {
      const audio = await downloadAudio(row.audioUrl);
      await submitJobs(row.id, pending.map((j) => ({ id: j.id, kind: j.kind })), audio, row.channel === null ? undefined : (row.channel as Channel));
    } catch (err) {
      // A rejected file has already been marked failed by submitJobs; anything else (audio gone, still down) waits for the next attempt.
      if (!(err instanceof AvocoApiError)) console.error("retry failed", row.id, err);
    }
  }
}

/** Sync mode: waits for AVOCO, stores every result, returns the finished analysis. Throws if any job fails. */
export async function runJobsNow(analysisId: string, jobs: Job[], audio: AudioInput, channel?: Channel): Promise<Analysis> {
  await runJobs(analysisId, jobs, async (job) => {
    const scales = await avoco().analyze(job.kind, audio, channel);
    await recordJobResult(job.id, { id: job.id, [job.kind === "psytype" ? "psy_types" : "emo_scales"]: scales });
  });
  return (await getAnalysis(analysisId))!;
}

/** Sync mode only: runs all jobs in parallel. On any failure the failed jobs and the analysis are marked failed, then the first error is rethrown. */
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
      or(eq(analyses.status, "processing"), eq(analyses.status, "queued"), and(eq(analyses.status, "failed"), eq(analyses.error, "timeout"))),
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

/** Anything still processing after 15 minutes is marked failed with error "timeout"; a queued analysis is given up on after a day. */
async function expireStale(id?: string): Promise<void> {
  const cutoff = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  await db().update(analyses)
    .set({ status: "failed", error: "timeout", completedAt: new Date() })
    .where(and(eq(analyses.status, "processing"), lt(analyses.createdAt, cutoff), id ? eq(analyses.id, id) : undefined));
  const giveUp = new Date(Date.now() - QUEUE_MAX_AGE_MS);
  await db().update(analyses)
    .set({ status: "failed", error: "service_unavailable", completedAt: new Date() })
    .where(and(eq(analyses.status, "queued"), lt(analyses.createdAt, giveUp), id ? eq(analyses.id, id) : undefined));
}

export async function getAnalysis(id: string): Promise<Analysis | null> {
  await expireStale(id);
  await retryQueued(id, 1);
  const [row] = await db().select().from(analyses).where(eq(analyses.id, id));
  return row ?? null;
}

/** History, newest first. The cursor is the (created_at, id) of the last row already seen. */
export async function listAnalyses(opts: { externalUserId?: string; limit: number; cursor?: Cursor }) {
  await expireStale();
  await retryQueued();
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
