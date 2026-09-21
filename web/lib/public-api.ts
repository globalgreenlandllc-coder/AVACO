import "server-only";
import { fieldFits } from "./fit";
import type { Analysis } from "./gateway";
import { zoneOf } from "./report";
import type { Participant, Workspace } from "./db";
import { workspaceForApiKey } from "./workspaces";

/** The workspace behind `Authorization: Bearer avk_…` (or x-api-key), or null. */
export function workspaceFromRequest(req: Request): Promise<Workspace | null> {
  const header = req.headers.get("authorization");
  return workspaceForApiKey(header?.startsWith("Bearer ") ? header.slice(7).trim() : req.headers.get("x-api-key")?.trim());
}

/** The shape companies get from the API: scores, zones and the best-fit fields. Texts stay in the app. */
export function apiAnalysis(analysis: Analysis, participant: Participant, ws: Workspace) {
  const psytype = analysis.psytype?.map((p) => ({ key: p.key, label: p.label, value: p.value, zone: zoneOf(p.value) })) ?? null;
  return {
    id: analysis.id,
    status: analysis.status,
    name: participant.name,
    created_at: analysis.created_at,
    completed_at: analysis.completed_at,
    psytype,
    emostate: ws.hideEmotions ? null : analysis.emostate,
    best_fit: psytype ? fieldFits(psytype).map((f) => ({ field: f.key, score: f.score })) : null,
    error: analysis.error ? (analysis.error === "timeout" ? "timeout" : "analysis_failed") : null,
  };
}
