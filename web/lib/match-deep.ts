/**
 * The couple's report, closer up: eight areas of a shared life (money, pace, ambition, decisions, talk, stress, love,
 * people), each read for the two leading types. For every area both partners' official AVOCO texts are shown side by
 * side, and the pair is read on one axis per area: where the two types sit far apart it rubs, where both sit at one
 * end they share a blind spot. AVOCO's API has no such reading; this is the platform's, built on AVOCO's texts.
 * Language-free rules here; every word is in lib/i18n/match-deep-*.ts. Pure, tested.
 */
import type { Dict } from "./i18n";
import type { FullProfile } from "./i18n/types-ru";
import type { TypeKey } from "./match";
import { isWorkKind, type MatchKind } from "./match-kind";

export const THEMES = ["money", "pace", "drive", "decisions", "talk", "stress", "love", "space"] as const;
export type Theme = (typeof THEMES)[number];
export type Kind = "contrast" | "bothHigh" | "bothLow" | "aligned";

/**
 * Where each type sits on an area's axis, 0 to 100. Money: careful (0) to free-spending (100). Pace: deliberate to
 * fast. Drive: contentment to ambition. Decisions: weighed to on-the-spot. Talk: reserved and factual to expressive
 * and emotional. Stress: turns inward to turns outward. Love: needs room to needs closeness. People: private to wide.
 */
export const AXIS: Record<Theme, Record<TypeKey, number>> = {
  money: { organizer: 20, driver: 70, catalyst: 85, performer: 90, harmonizer: 35, analyst: 45, skeptic: 10, mediator: 30 },
  pace: { organizer: 40, driver: 90, catalyst: 95, performer: 80, harmonizer: 50, analyst: 25, skeptic: 15, mediator: 35 },
  drive: { organizer: 75, driver: 95, catalyst: 70, performer: 70, harmonizer: 30, analyst: 50, skeptic: 45, mediator: 20 },
  decisions: { organizer: 35, driver: 85, catalyst: 90, performer: 80, harmonizer: 55, analyst: 25, skeptic: 10, mediator: 40 },
  talk: { organizer: 35, driver: 60, catalyst: 85, performer: 95, harmonizer: 75, analyst: 15, skeptic: 30, mediator: 45 },
  stress: { organizer: 60, driver: 95, catalyst: 70, performer: 80, harmonizer: 30, analyst: 10, skeptic: 40, mediator: 20 },
  love: { organizer: 45, driver: 50, catalyst: 60, performer: 85, harmonizer: 95, analyst: 10, skeptic: 40, mediator: 70 },
  space: { organizer: 45, driver: 65, catalyst: 95, performer: 90, harmonizer: 60, analyst: 10, skeptic: 25, mediator: 30 },
};

/** Working together, for the pairs who work rather than live together: leads (100) to supports (0). */
export const WORK_AXIS: Record<TypeKey, number> = { organizer: 75, driver: 95, catalyst: 70, performer: 65, harmonizer: 30, analyst: 35, skeptic: 45, mediator: 20 };

/** Far apart rubs; both at one end is a shared blind spot; anything else pulls the same way. */
export function kindOf(theme: Theme, a: TypeKey, b: TypeKey, axis: Record<TypeKey, number> = AXIS[theme]): Kind {
  const x = axis[a], y = axis[b];
  if (Math.abs(x - y) >= 40) return "contrast";
  if (x >= 65 && y >= 65) return "bothHigh";
  if (x <= 35 && y <= 35) return "bothLow";
  return "aligned";
}

export interface DeepSide { name: string; type: string; points: string[] }
export interface DeepTheme { key: Theme; name: string; blurb: string; kind: Kind; a: DeepSide; b: DeepSide; rub: string; help: string }
export interface Deep {
  title: string; lead: string; note: string;
  avocoTitle: string; rubTitle: string; helpTitle: string; kinds: Record<Kind, string>;
  /** AVOCO's own compatibility table, read from each side; empty when neither type has a full profile. */
  avoco: string[];
  themes: DeepTheme[];
}

/** The official AVOCO texts of one type that speak to an area, in the report's language. */
export function officialPoints(theme: Theme, full: FullProfile | undefined, ui: Dict["types"]["ui"], work = false): string[] {
  if (!full) return [];
  const { motivation: m, resources: r, communication: c, stress: s, relationships: rel } = full;
  if (theme === "love" && work) return [rel.business, rel.businessProblem];
  switch (theme) {
    case "money": return [m.money, r.money];
    case "pace": return [r.time];
    case "drive": return [m.motive, m.needs];
    case "decisions": return [c.decisions];
    case "talk": return [c.channel, `${ui.wantToHear}: ${c.wantToHear.slice(0, 3).map((w) => `“${w}”`).join(", ")}.`];
    case "stress": return [`${ui.emotion}: ${s.emotion}`, `${ui.triggers}: ${s.triggers.join(" ")}`, s.exit];
    case "love": return [rel.love, rel.loveProblem];
    case "space": return [r.people];
  }
}

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));

/**
 * The eight areas for two leading types, every string in the reader's language. The closest area is love for a couple,
 * working together for business partners and colleagues, and closeness for family and friends.
 */
export function deepReading(la: TypeKey, lb: TypeKey, names: { a: string; b: string }, t: Dict, kind: MatchKind = "couple"): Deep {
  const d = t.content.matchDeep;
  const work = isWorkKind(kind);
  const ui = t.types.ui;
  const profiles = t.types.profiles as Record<string, { full?: FullProfile }>;
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const fullA = profiles[la]?.full, fullB = profiles[lb]?.full;
  const vars = { a: names.a, b: names.b, ta: typeName(la), tb: typeName(lb) };

  const avoco: string[] = [];
  for (const [from, to, full, who] of [[la, lb, fullA, "a"], [lb, la, fullB, "b"]] as const) {
    const entry = full?.compatibility?.[to];
    if (entry) avoco.push(fill(d.ui.avocoLine, { name: who === "a" ? names.a : names.b, from: typeName(from), to: typeName(to), n: String(entry.score), note: entry.note }));
  }

  const themes = THEMES.map((key): DeepTheme => {
    const text = key === "love" && work ? d.work : key === "love" && kind !== "couple" ? { ...d.themes.love, ...d.care } : d.themes[key];
    const pairKind = kindOf(key, la, lb, key === "love" && work ? WORK_AXIS : undefined);
    const sa = text.stance[la], sb = text.stance[lb];
    const wants = (full: FullProfile | undefined) => full?.communication.wantToHear.slice(0, 2).map((w) => `“${w}”`).join(", ") ?? "";
    const v = { ...vars, sa, sb, wantA: wants(fullA), wantB: wants(fullB) };
    // A help line that names what each wants to hear needs both profiles; otherwise the plain line.
    const helpKind = pairKind === "contrast" && key === "talk" && (!v.wantA || !v.wantB) ? "aligned" : pairKind;
    return {
      key, name: text.name, blurb: text.blurb, kind: pairKind,
      a: { name: names.a, type: typeName(la), points: officialPoints(key, fullA, ui, work) },
      b: { name: names.b, type: typeName(lb), points: officialPoints(key, fullB, ui, work) },
      rub: fill(text.rub[pairKind], v),
      help: fill(text.help[helpKind], v),
    };
  });

  return { title: d.ui.title, lead: fill(d.ui.lead, vars), note: d.ui.note, avocoTitle: d.ui.avocoTitle, rubTitle: d.ui.rub, helpTitle: d.ui.help, kinds: d.ui.kinds, avoco, themes };
}
