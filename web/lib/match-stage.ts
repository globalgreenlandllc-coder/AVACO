/** Where the partner is, for the tracker both sides see. Pure, tested. */
export type Stage = "invited" | "opened" | "recording" | "analysing" | "ready";

export function stageOf(input: { openedAt: Date | string | null; startedAt: Date | string | null; analyses: Array<{ status: string }> }): Stage {
  if (input.analyses.some((a) => a.status === "completed")) return "ready";
  if (input.analyses.length > 0) return "analysing";
  if (input.startedAt) return "recording";
  if (input.openedAt) return "opened";
  return "invited";
}
