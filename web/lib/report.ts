/** Turns gateway results into what the report shows, in the visitor's language. Pure, so it can be tested. */
import type { Dict } from "./i18n/en";

export type Zone = "leading" | "active" | "background";
export interface ScaleRow { key: string; name: string; text: string | null; value: number; zone?: Zone }

type Entry = { key: string; label: string; value: number; zone?: Zone };
type Glossary = Record<string, { name: string; text: string }>;

/** A scale this app doesn't know yet still shows up, under the label the gateway sent. */
function localize(items: Entry[], glossary: Glossary): ScaleRow[] {
  return items.map((item) => {
    const known = Object.hasOwn(glossary, item.key) ? glossary[item.key] : null;
    return { key: item.key, name: known?.name ?? item.label, text: known?.text ?? null, value: item.value, zone: item.zone };
  });
}

export const psytypeRows = (items: Entry[], t: Dict) => localize(items, t.psytypes);
export const emostateRows = (items: Entry[], t: Dict) => localize(items, t.emostate);

/** Types at 50 or above. Empty means a balanced profile; the caller then names the strongest one. */
export const leadingTypes = (rows: ScaleRow[]) => rows.filter((r) => r.zone === "leading");

export type FailureKind = "audio" | "timeout" | "generic";

/** The gateway stores errors like "psytype: <AVOCO's reason>" or "timeout". We show our own wording, never the raw text. */
export function failureKind(error: string | null): FailureKind {
  if (error === "timeout") return "timeout";
  if (!error || /unavailable|internal error/i.test(error)) return "generic";
  return "audio";
}
