/**
 * GET    /api/v1/analyses/:id — the analysis with its status and formatted results.
 * DELETE /api/v1/analyses/:id — deletes the analysis, its jobs and its audio file.
 */
import { del } from "@vercel/blob";
import { deleteAnalysisRow, getAnalysis } from "@/lib/analyses";
import { json, requireApiKey } from "@/lib/auth";
import { formatAnalysis } from "@/lib/format";
import { errorJson, handleRouteError, isUuid, notFound } from "@/lib/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Context) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const analysis = isUuid(id) ? await getAnalysis(id) : null;
    return analysis ? json(formatAnalysis(analysis)) : notFound();
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: Request, ctx: Context) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const analysis = isUuid(id) ? await getAnalysis(id) : null;
    if (!analysis) return notFound();

    // Audio first: if Blob fails the row stays, so the caller can retry and nothing is orphaned.
    if (isBlobUrl(analysis.audioUrl)) {
      try {
        await del(analysis.audioUrl);
      } catch (err) {
        console.error("Blob delete failed", err);
        return errorJson("upstream_error", "Could not delete the audio file, try again", 502);
      }
    }
    await deleteAnalysisRow(id);
    return json({ id, deleted: true, audio_deleted: isBlobUrl(analysis.audioUrl) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Only Vercel Blob files are ours to delete; audio on another allowed host is left to its owner. */
function isBlobUrl(url: string): boolean {
  return new URL(url).hostname.toLowerCase().endsWith(".blob.vercel-storage.com");
}
