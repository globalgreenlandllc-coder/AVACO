/** Turns gateway results into what the report shows, in the visitor's language. Pure, so it can be tested. */
import type { Dict } from "./i18n/en";
import type { FullProfile, TypeProfile } from "./i18n/types-ru";
import { fieldFits, type FieldKey } from "./fit";

export type Zone = "leading" | "active" | "background";
export type Band = "high" | "mid" | "low";
export interface Rating { name: string; score: number; label: string; note: string }
export interface DetailSection {
  /** Chapter heading, shown once above the first section that carries it. */
  group?: string;
  title: string;
  /** Small print under the title (what a stress stage is, for instance). */
  note?: string;
  text?: string;
  items?: string[];
  /** Short phrases shown as pills: vocabulary, "what they want to hear". */
  chips?: string[];
  /** A sentence to set apart: the stress "pattern". */
  quote?: string;
  ratings?: Rating[];
}
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
/** AVOCO's thresholds. Applied to the value as shown, so an old stored zone can never contradict the number. */
export const zoneOf = (value: number): Zone => (value >= 50 ? "leading" : value >= 30 ? "active" : "background");

const lookup = <T,>(table: Record<string, T>, key: string): T | null => (Object.hasOwn(table, key) ? table[key] : null);

/** Emotional scales have no zones in AVOCO; these bands are this platform's reading of 0 to 100. */
export const bandOf = (value: number): Band => (value >= 60 ? "high" : value >= 35 ? "mid" : "low");

export function psytypeRows(items: Entry[], t: Dict): ScaleRow[] {
  return items.map((item) => {
    const short = lookup(t.psytypes, item.key);
    const zone = zoneOf(item.value);
    return {
      key: item.key,
      name: short?.name ?? item.label, // an unknown type still shows, under the gateway's label
      text: short?.text ?? null,
      value: item.value,
      zone,
      tag: t.report.zones[zone],
      details: typeDetails(item.key, item.value, zone, t),
    };
  });
}

/**
 * The panel behind a type. AVOCO's official description always; then its full official report
 * where we have one, or else the short reading drawn from the description.
 */
function typeDetails(key: string, value: number, zone: Zone, t: Dict): DetailSection[] {
  const profile = lookup(t.types.profiles as Record<string, TypeProfile>, key);
  if (!profile) return [];
  const ui = t.types.ui;
  const head: DetailSection[] = [
    { title: t.deep.ui.yourScore, text: t.deep.zoneMeaning[zone].replace("{value}", String(value)) },
    { title: ui.overview, text: profile.overview },
  ];
  if (profile.full) return [...head, ...fullProfileSections(profile.full, t)];

  const reading = lookup(t.deep.psytypes, key);
  if (!reading) return head;
  return [
    ...head,
    { title: t.deep.ui.strengths, items: reading.strengths },
    { title: t.deep.ui.watch, items: reading.watch },
    { title: t.deep.ui.communicate, text: reading.communicate },
    { title: t.deep.ui.role, text: reading.role },
    { title: ui.pendingTitle, note: ui.partialNote },
  ];
}

/** The chapters of AVOCO's original report, in its order. */
function fullProfileSections(full: FullProfile, t: Dict): DetailSection[] {
  const ui = t.types.ui;
  const g = ui.groups;
  const { team, motivation, resources, communication: talk, stress, relationships: rel } = full;
  const ratings = Object.entries(full.compatibility).map(([key, c]) => ({
    name: lookup(t.psytypes, key)?.name ?? key,
    score: c.score,
    label: ui.outOf.replace("{score}", String(c.score)),
    note: c.note,
  }));

  return [
    { title: ui.mindset, text: full.mindset },

    { group: g.team, title: g.team, text: team.intro },
    { group: g.team, title: ui.roles, text: team.roles },
    { group: g.team, title: ui.socialRole, text: team.socialRole },
    { group: g.team, title: ui.strengths, items: team.strengths },
    { group: g.team, title: ui.risks, items: team.risks },
    { group: g.team, title: ui.authority, text: team.authority },
    { group: g.team, title: ui.subordination, text: team.subordination },
    { group: g.team, title: ui.environment, text: team.environment },

    { group: g.motivation, title: ui.motive, text: motivation.motive },
    { group: g.motivation, title: ui.needs, text: motivation.needs },
    { group: g.motivation, title: ui.management, text: motivation.management },
    { group: g.motivation, title: ui.money, text: motivation.money },

    { group: g.resources, title: ui.time, text: resources.time },
    { group: g.resources, title: ui.money, text: resources.money },
    { group: g.resources, title: ui.people, text: resources.people },

    { group: g.communication, title: ui.interaction, items: talk.interaction },
    { group: g.communication, title: ui.channel, text: talk.channel },
    { group: g.communication, title: ui.decisions, text: talk.decisions },
    { group: g.communication, title: ui.speech, text: talk.speech },
    { group: g.communication, title: ui.wantToHear, chips: talk.wantToHear },
    { group: g.communication, title: ui.vocabulary, chips: talk.vocabulary },

    { group: g.stress, title: ui.emotion, text: stress.emotion },
    { group: g.stress, title: ui.mask, items: stress.mask },
    { group: g.stress, title: ui.triggers, items: stress.triggers },
    { group: g.stress, title: ui.stage1, note: ui.stage1Note, items: stress.stage1 },
    { group: g.stress, title: ui.stage2, note: ui.stage2Note, items: stress.stage2, quote: `${ui.pattern}: ${stress.pattern2}` },
    { group: g.stress, title: ui.extreme, note: ui.extremeNote, items: stress.extreme, quote: `${ui.pattern}: ${stress.patternExtreme}` },
    { group: g.stress, title: ui.bottom, note: ui.bottomNote, items: stress.bottom },
    { group: g.stress, title: ui.exit, text: stress.exit },
    { group: g.stress, title: ui.negative, items: stress.negative },

    { group: g.relationships, title: ui.business, text: rel.business },
    { group: g.relationships, title: ui.businessProblem, text: rel.businessProblem },
    { group: g.relationships, title: ui.love, text: rel.love },
    { group: g.relationships, title: ui.loveProblem, text: rel.loveProblem },
    { group: g.relationships, title: ui.style, items: rel.style },

    { group: g.compatibility, title: g.compatibility, note: ui.compatibilityLead, ratings },
  ];
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
  const fits = fitRows(psy, t, emo).slice(0, 2);
  if (fits.length > 0) lines.push(t.deep.fit.summary.replace("{names}", fits.map((f) => `${f.name} (${f.score})`).join(", ")));
  if (emo.length >= 6) {
    lines.push(ui.summaryEmoTop.replace("{names}", names(emo.slice(0, 3))));
    lines.push(ui.summaryEmoLow.replace("{names}", names(emo.slice(-3).reverse())));
  }
  return lines;
}

export interface FitRow {
  key: FieldKey;
  sector: string;
  name: string;
  text: string;
  /** Example jobs in this field. */
  roles: string;
  score: number;
  typeScore: number;
  stateScore: number | null;
  /** One line naming what the score came from: the types, and the emotional scales as they sound right now. */
  because: string;
}

/**
 * Fields of work, best fit first. Pass the emotional rows to include the state part of the score;
 * a workspace that hides emotional state passes none, and the score is personality alone.
 */
export function fitRows(psy: ScaleRow[], t: Dict, emo: ScaleRow[] = []): FitRow[] {
  const f = t.deep.fit;
  const typeName = (key: string) => lookup(t.psytypes, key)?.name ?? key;
  const scaleName = (key: string) => lookup(t.emostate, key)?.name ?? key;
  return fieldFits(psy, emo.length > 0 ? emo : null).map((fit) => {
    const personality = `${f.personality} ${fit.typeScore}: ${fit.types.map((d) => `${typeName(d.key)} ${d.value}`).join(", ")}`;
    const state = fit.stateScore === null ? "" : ` · ${f.rightNow} ${fit.stateScore}: ${fit.scales.map((d) => `${scaleName(d.key)} ${d.value}`).join(", ")}`;
    return {
      key: fit.key,
      sector: f.sectors[fit.sector],
      name: f.fields[fit.key].name,
      text: f.fields[fit.key].text,
      roles: `${f.roles}: ${f.fields[fit.key].roles}`,
      score: fit.score,
      typeScore: fit.typeScore,
      stateScore: fit.stateScore,
      because: personality + state,
    };
  });
}

export type FailureKind = "audio" | "timeout" | "generic";

/** The gateway stores errors like "psytype: <AVOCO's reason>" or "timeout". We show our own wording, never the raw text. */
export function failureKind(error: string | null): FailureKind {
  if (error === "timeout" || error === "service_unavailable") return "timeout";
  if (!error || /unavailable|internal error/i.test(error)) return "generic";
  return "audio";
}
