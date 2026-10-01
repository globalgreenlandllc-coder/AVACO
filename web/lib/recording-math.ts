/**
 * Admin → Statistics, "Recordings": every voice recording of the last 30 days, what became of it (analysed, failed,
 * the report opened free or paid, or left at the preview), what kind it was, the type it found, and where its person
 * came from: the platform, the ad, the placement, the place, the device. Computed from plain rows (lib/recording-stats.ts
 * loads them), so it can be tested without a database. Days are UTC like the rest of the admin; hours New York time.
 */
import { PLATFORM_NAMES, ZONE } from "./visits-math";

export type RecordingKind = "own" | "someone" | "partner" | "company" | "partner-page" | "open";
export const KIND_NAMES: Record<RecordingKind, string> = {
  own: "Own voice (an account)",
  someone: "Someone else's voice, recorded on an account",
  partner: "Invited partner (Relationship & Compatibility)",
  company: "Company recording",
  "partner-page": "Partner page (free test)",
  open: "Open site (free test)",
};

/** The same, short, for a row of the list. */
export const KIND_SHORT: Record<RecordingKind, string> = { own: "Own voice", someone: "Someone else's voice", partner: "Invited partner", company: "Company", "partner-page": "Partner page", open: "Open site" };

/** What the person got: the full report opened (free first report, paid, …), only the preview, or no report. */
export type Outcome = "free" | "paid" | "admin" | "billing-off" | "preview" | "included" | "failed" | "waiting";
export const OUTCOME_NAMES: Record<Outcome, string> = {
  free: "Free first report", paid: "Full report, paid", admin: "Opened by an admin", "billing-off": "Full report (charging off)",
  preview: "Preview only, not opened", included: "Report included", failed: "Analysis failed", waiting: "Being analysed",
};

/** Where the recording's person first came in: their account's first tracked visit (for an invited partner, the inviter's). */
export interface Door {
  source: string; paid: boolean; campaign: string | null; content: string | null; term: string | null;
  country: string | null; region: string | null; city: string | null; device: string | null;
}

export interface RecordingRow {
  id: string; at: Date; status: string; error: string | null; kind: RecordingKind;
  /** The leading type of a finished analysis. */
  leader: { key: string; label: string; value: number } | null;
  outcome: Outcome;
  /** For an invited partner: what the two are to each other (couple, business…). */
  matchKind: string | null;
  /** The account behind it, as the admin knows it (name · email); null for the free test sites. */
  who: string | null;
  door: Door | null;
}

export interface RecordingStats {
  total: number; analysed: number; failed: number; waiting: number;
  /** Full reports opened, by how; and finished analyses whose report stayed at the preview. */
  opened: { free: number; paid: number; other: number }; previewOnly: number;
  series: Array<{ day: string; value: number }>;
  hours: Array<{ hour: number; views: number }>;
  kinds: Array<{ kind: RecordingKind; label: string; recorded: number; analysed: number }>;
  types: Array<{ key: string; label: string; n: number }>;
  outcomes: Array<{ outcome: Outcome; label: string; n: number }>;
  sources: Array<{ source: string; label: string; recorded: number; fromAds: number; analysed: number; opened: number }>;
  ads: Array<{ source: string; campaign: string; ad: string; placement: string | null; recorded: number; analysed: number; opened: number }>;
  places: Array<{ label: string; n: number }>;
  devices: Array<{ device: string; n: number }>;
  recent: RecordingRow[];
}

const DAY = 86_400_000;
const OPENED: Outcome[] = ["free", "paid", "admin", "billing-off", "included"];
const region = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const countryName = (cc: string) => { try { return region?.of(cc) ?? cc; } catch { return cc; } };
export const sourceLabel = (source: string) => PLATFORM_NAMES[source] ?? (source === "unknown" ? "Not tracked (no visit on record)" : source === "test" ? "Free test sites" : source === "company" ? "Company link" : source);

const count = <K extends string>(items: K[]) => { const m = new Map<K, number>(); for (const k of items) m.set(k, (m.get(k) ?? 0) + 1); return m; };

export function summarizeRecordings(rows: RecordingRow[], now = new Date()): RecordingStats {
  const t = now.getTime();
  const month = rows.filter((r) => r.at.getTime() > t - 30 * DAY && r.at.getTime() <= t + 60_000).sort((a, b) => b.at.getTime() - a.at.getTime());
  const analysed = month.filter((r) => r.status === "completed");
  const opened = (r: RecordingRow) => OPENED.includes(r.outcome);
  const sourceOf = (r: RecordingRow) => r.door?.source ?? (r.kind === "company" ? "company" : r.kind === "partner-page" || r.kind === "open" ? "test" : "unknown");

  const days = Array.from({ length: 30 }, (_, i) => new Date(t - (29 - i) * DAY).toISOString().slice(0, 10));
  const perDay = count(month.map((r) => r.at.toISOString().slice(0, 10)));
  const hourOf = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" });
  const perHour = count(month.map((r) => String(Number(hourOf.format(r.at)) % 24)));

  const kinds = (Object.keys(KIND_NAMES) as RecordingKind[])
    .map((kind) => ({ kind, label: KIND_NAMES[kind], recorded: month.filter((r) => r.kind === kind).length, analysed: analysed.filter((r) => r.kind === kind).length }))
    .filter((k) => k.recorded > 0).sort((a, b) => b.recorded - a.recorded);
  const typeBy = new Map<string, { label: string; n: number }>();
  for (const r of analysed) if (r.leader) { const x = typeBy.get(r.leader.key) ?? { label: r.leader.label, n: 0 }; x.n++; typeBy.set(r.leader.key, x); }
  const outcomes = [...count(month.map((r) => r.outcome))].map(([outcome, n]) => ({ outcome, label: OUTCOME_NAMES[outcome], n })).sort((a, b) => b.n - a.n);

  const srcBy = new Map<string, { recorded: number; fromAds: number; analysed: number; opened: number }>();
  const adBy = new Map<string, { source: string; campaign: string; ad: string; placement: string | null; recorded: number; analysed: number; opened: number }>();
  for (const r of month) {
    const s = srcBy.get(sourceOf(r)) ?? { recorded: 0, fromAds: 0, analysed: 0, opened: 0 };
    s.recorded++; if (r.door?.paid) s.fromAds++; if (r.status === "completed") s.analysed++; if (opened(r)) s.opened++;
    srcBy.set(sourceOf(r), s);
    if (r.door && (r.door.paid || r.door.campaign)) {
      const key = [r.door.source, r.door.campaign ?? "", r.door.content ?? "", r.door.term ?? ""].join("|");
      const a = adBy.get(key) ?? { source: r.door.source, campaign: r.door.campaign ?? "(no campaign name)", ad: r.door.content ?? "(no ad name)", placement: r.door.term, recorded: 0, analysed: 0, opened: 0 };
      a.recorded++; if (r.status === "completed") a.analysed++; if (opened(r)) a.opened++;
      adBy.set(key, a);
    }
  }
  const placeOf = (d: Door) => (d.country === "US" && d.region ? `${d.city ? `${d.city}, ` : ""}${d.region}, United States` : d.country ? `${d.city ? `${d.city}, ` : ""}${countryName(d.country)}` : null);

  return {
    total: month.length, analysed: analysed.length, failed: month.filter((r) => r.status === "failed").length,
    waiting: month.filter((r) => r.status === "processing" || r.status === "queued").length,
    opened: { free: month.filter((r) => r.outcome === "free").length, paid: month.filter((r) => r.outcome === "paid").length, other: month.filter((r) => ["admin", "billing-off", "included"].includes(r.outcome)).length },
    previewOnly: month.filter((r) => r.outcome === "preview").length,
    series: days.map((day) => ({ day, value: perDay.get(day) ?? 0 })),
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, views: perHour.get(String(hour)) ?? 0 })),
    kinds,
    types: [...typeBy].map(([key, x]) => ({ key, ...x })).sort((a, b) => b.n - a.n),
    outcomes,
    sources: [...srcBy].map(([source, x]) => ({ source, label: sourceLabel(source), ...x })).sort((a, b) => b.recorded - a.recorded),
    ads: [...adBy.values()].sort((a, b) => b.recorded - a.recorded).slice(0, 12),
    places: [...count(month.map((r) => (r.door ? placeOf(r.door) : null)).filter((p): p is string => Boolean(p)))].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 10),
    devices: [...count(month.map((r) => r.door?.device ?? "unknown"))].map(([device, n]) => ({ device, n })).sort((a, b) => b.n - a.n),
    recent: month.slice(0, 40),
  };
}
