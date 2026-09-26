/**
 * The industry chapter as it leaves the server: every string already in the visitor's language, so the
 * browser only lays it out. The catalogue text itself never reaches a browser that hasn't opened the chapter.
 */
import type { Dict } from "./i18n";
import { industriesEn, type IndustryText } from "./i18n/industries-en";
import { industriesRu } from "./i18n/industries-ru";
import { industryFit, LEVELS, type IndustryKey, type Level, type TypeKey } from "./industries";

export interface ChapterRole { key: string; name: string; text: string; level: Level; levelLabel: string; score: number; because: string }
export interface IndustryChapter {
  industry: IndustryKey;
  name: string;
  blurb: string;
  overall: number;
  fitTitle: string;
  rolesTitle: string;
  roles: ChapterRole[];
  pathTitle: string;
  path: Array<{ level: Level; label: string; role: ChapterRole }>;
  rewardsTitle: string;
  rewards: string[];
  angleTitle: string;
  angle: string;
  watchTitle: string;
  watch: string[];
  scoreHelp: string;
}

/** The industry names for the picker, in the visitor's language (English for added languages, for now). */
export function industryNames(locale: string): Array<{ key: IndustryKey; name: string }> {
  const texts = textsFor(locale);
  return (Object.keys(industriesEn) as IndustryKey[]).map((key) => ({ key, name: texts[key].name })).sort((a, b) => a.name.localeCompare(b.name));
}

const textsFor = (locale: string): Record<string, IndustryText> => (locale === "ru" ? industriesRu : industriesEn);

/** Builds the chapter for one report. Null unless all eight types were scored. */
export function industryChapter(industry: IndustryKey, types: Array<{ key: string; value: number }>, t: Dict, locale: string): IndustryChapter | null {
  const fit = industryFit(industry, types);
  if (!fit) return null;
  const text = textsFor(locale)[industry];
  const ui = t.industry;
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const fill = (s: string) => s.replace("{industry}", text.name);

  const roles: ChapterRole[] = fit.roles.map((r) => ({
    key: r.key,
    name: text.roles[r.key]?.name ?? r.key,
    text: text.roles[r.key]?.text ?? "",
    level: r.level,
    levelLabel: ui.levels[r.level],
    score: r.score,
    because: `${ui.because}: ${r.because.map((b) => `${typeName(b.type)} ${b.value}`).join(", ")}`,
  }));
  const byKey = new Map(roles.map((r) => [r.key, r]));

  // The person's own angle: their strongest type, with its score, and the watch-outs AVOCO's reading gives that type.
  const leading = [...types].sort((a, b) => b.value - a.value)[0];
  const leadKey = leading.key as TypeKey;
  const angle = Object.hasOwn(ui.angle, leadKey) ? ui.angle[leadKey].replace("{value}", String(leading.value)) : "";
  const watch = Object.hasOwn(t.deep.psytypes, leadKey) ? t.deep.psytypes[leadKey as keyof typeof t.deep.psytypes].watch : [];

  return {
    industry,
    name: text.name,
    blurb: text.blurb,
    overall: fit.overall,
    fitTitle: fill(ui.fitTitle),
    rolesTitle: fill(ui.rolesTitle),
    roles,
    pathTitle: ui.pathTitle,
    path: LEVELS.map((level) => ({ level, label: ui.levels[level], role: byKey.get(fit.path[level].key)! })),
    rewardsTitle: ui.rewardsTitle,
    rewards: text.rewards,
    angleTitle: fill(ui.angleTitle),
    angle,
    watchTitle: ui.watchTitle,
    watch,
    scoreHelp: ui.scoreHelp,
  };
}
