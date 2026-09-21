/** Turns gateway results into what the report shows, in the visitor's language. Pure, so it can be tested. */
import type { Dict } from "./i18n/en";

export type Zone = "leading" | "active" | "background";
export type Band = "high" | "mid" | "low";
export interface DetailSection { title: string; text?: string; items?: string[] }
export interface ScaleRow {
  key: string;
  name: string;
  /** One-line description. Null for a scale this app doesn't know yet. */
  text: string | null;
  value: number;
  zone?: Zone;
  /** Short tag beside the value: the zone for a type, the band for an emotional scale. */
  tag?: string;
  /** What opens when the row is clicked. Empty for an unknown scale. */
  details: DetailSection[];
}

type Entry = { key: string; label: string; value: number; zone?: Zone };
const lookup = <T,>(table: Record<string, T>, key: string): T | null => (Object.hasOwn(table, key) ? table[key] : null);

/** Emotional scales have no zones in AVOCO; these bands are this platform's reading of 0 to 100. */
export const bandOf = (value: number): Band => (value >= 60 ? "high" : value >= 35 ? "mid" : "low");

export function psytypeRows(items: Entry[], t: Dict): ScaleRow[] {
  const ui = t.deep.ui;
  return items.map((item) => {
    const short = lookup(t.psytypes, item.key);
    const deep = lookup(t.deep.psytypes, item.key);
    const zone = item.zone ?? "background";
    return {
      key: item.key,
      name: short?.name ?? item.label, // an unknown type still shows, under the gateway's label
      text: short?.text ?? null,
      value: item.value,
      zone,
      tag: t.report.zones[zone],
      details: deep ? [
        { title: ui.yourScore, text: t.deep.zoneMeaning[zone].replace("{value}", String(item.value)) },
        { title: ui.essence, text: deep.essence },
        { title: ui.strengths, items: deep.strengths },
        { title: ui.watch, items: deep.watch },
        { title: ui.communicate, text: deep.communicate },
        { title: ui.role, text: deep.role },
      ] : [],
    };
  });
}

export function emostateRows(items: Entry[], t: Dict): ScaleRow[] {
  const ui = t.deep.ui;
  return items.map((item) => {
    const short = lookup(t.emostate, item.key);
    const deep = lookup(t.deep.emostate, item.key);
    const band = bandOf(item.value);
    return {
      key: item.key,
      name: short?.name ?? item.label,
      text: short?.text ?? null,
      value: item.value,
      tag: ui.bands[band],
      details: deep ? [
        { title: `${ui.yourScore}: ${ui.bands[band].toLowerCase()} (${item.value})`, text: deep[band] },
        { title: ui.measures, text: deep.measures },
      ] : [],
    };
  });
}

/** Types at 50 or above. Empty means a balanced profile; the caller then names the strongest one. */
export const leadingTypes = (rows: ScaleRow[]) => rows.filter((r) => r.zone === "leading");

/** The few sentences at the top of the report. Built only from the scores, so it never claims more than AVOCO returned. */
export function summaryLines(psy: ScaleRow[], emo: ScaleRow[], t: Dict): string[] {
  const ui = t.deep.ui;
  const names = (rows: ScaleRow[]) => rows.map((r) => `${r.name} (${r.value})`).join(", ");
  const lines: string[] = [];
  const leaders = leadingTypes(psy);
  const active = psy.filter((r) => r.zone === "active");

  if (leaders.length > 0) lines.push(ui.summaryLeaders.replace("{names}", names(leaders)));
  else if (psy.length > 0) lines.push(ui.summaryBalanced.replace("{names}", names(psy.slice(0, 2))));
  if (active.length > 0) lines.push(ui.summaryActive.replace("{names}", names(active)));
  if (emo.length >= 6) {
    lines.push(ui.summaryEmoTop.replace("{names}", names(emo.slice(0, 3))));
    lines.push(ui.summaryEmoLow.replace("{names}", names(emo.slice(-3).reverse())));
  }
  return lines;
}

export type FailureKind = "audio" | "timeout" | "generic";

/** The gateway stores errors like "psytype: <AVOCO's reason>" or "timeout". We show our own wording, never the raw text. */
export function failureKind(error: string | null): FailureKind {
  if (error === "timeout") return "timeout";
  if (!error || /unavailable|internal error/i.test(error)) return "generic";
  return "audio";
}
