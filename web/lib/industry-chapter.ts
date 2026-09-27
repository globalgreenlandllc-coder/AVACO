/**
 * The industry chapter as it leaves the server: every string already in the visitor's language, so the
 * browser only lays it out. The catalogue text itself never reaches a browser that hasn't opened the chapter.
 */
import type { Dict } from "./i18n";
import type { IndustryText } from "./i18n/industries-en";
import { INDUSTRY_KEYS, industryFit, industryRanking, LEVELS, sectorOf, topIndustries, type IndustryKey, type Level, type SectorKey, type TypeKey } from "./industries";

export interface ChapterRole { key: string; name: string; text: string; level: Level; levelLabel: string; score: number; because: string; leansOn: string }
export interface IndustryChapter {
  industry: IndustryKey;
  name: string;
  blurb: string;
  overall: number;
  /** Where this industry stands among all of them for this person, and the ones that fit even better. */
  rankLine: string;
  alsoTitle: string;
  also: Array<{ key: IndustryKey; name: string; overall: number }>;
  alsoNone: string | null;
  pairTitle: string;
  pairText: string;
  todayTitle: string | null;
  today: Array<{ level: Level; text: string }>;
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

/** The industry names for the picker, in the dictionary's language (added languages are translated like the rest), each with its sector. */
export function industryNames(t: Dict): Array<{ key: IndustryKey; name: string; sector: SectorKey }> {
  const texts = textsFor(t);
  return (Object.keys(texts) as IndustryKey[]).map((key) => ({ key, name: texts[key].name, sector: sectorOf(key) })).sort((a, b) => a.name.localeCompare(b.name));
}

const textsFor = (t: Dict): Record<string, IndustryText> => t.content.industries;

/** Builds the chapter for one report. Null unless all eight types were scored. */
export function industryChapter(industry: IndustryKey, types: Array<{ key: string; value: number }>, t: Dict, locale: string, scales: Array<{ key: string; value: number }> | null = null): IndustryChapter | null {
  const fit = industryFit(industry, types, scales);
  if (!fit) return null;
  const texts = textsFor(t);
  const text = texts[industry];
  const ui = t.industry;
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const scaleName = (key: string) => (Object.hasOwn(t.emostate, key) ? t.emostate[key as keyof typeof t.emostate].name : key);
  const fill = (s: string) => s.replace("{industry}", text.name);
  const value = (key: string) => types.find((x) => x.key === key)?.value ?? 0;

  // Where this industry stands among all of them, and which fit better: names only, so no other chapter's content leaks.
  const ranking = industryRanking(types);
  const rank = ranking.findIndex((r) => r.industry === industry) + 1;
  const also = ranking.slice(0, 3).filter((r) => r.industry !== industry && r.overall > fit.overall).map((r) => ({ key: r.industry, name: texts[r.industry].name, overall: r.overall }));

  const roles: ChapterRole[] = fit.roles.map((r) => ({
    key: r.key,
    name: text.roles[r.key]?.name ?? r.key,
    text: text.roles[r.key]?.text ?? "",
    level: r.level,
    levelLabel: ui.levels[r.level],
    score: r.score,
    because: `${ui.because}: ${r.because.map((b) => `${typeName(b.type)} ${b.value}`).join(", ")}`,
    leansOn: ui.leansOn.replace("{type}", typeName(r.because[0].type)),
  }));
  const byKey = new Map(roles.map((r) => [r.key, r]));

  // The person's own angle: their strongest type, with its score, and the watch-outs AVOCO's reading gives that type.
  const leading = [...types].sort((a, b) => b.value - a.value)[0];
  const leadKey = leading.key as TypeKey;
  const angle = Object.hasOwn(ui.angle, leadKey) ? ui.angle[leadKey].replace("{value}", String(leading.value)) : "";
  const watch = Object.hasOwn(t.deep.psytypes, leadKey) ? t.deep.psytypes[leadKey as keyof typeof t.deep.psytypes].watch : [];

  const [a, b] = fit.pair.types;
  const pairRoles = fit.pair.roles.map((key) => byKey.get(key)?.name ?? key);
  const pairText = (pairRoles.length ? ui.pairText : ui.pairNone)
    .replace("{a}", typeName(a)).replace("{av}", String(value(a))).replace("{b}", typeName(b)).replace("{bv}", String(value(b))).replace("{roles}", pairRoles.join(", "));
  const today = fit.today
    ? LEVELS.map((level) => ({ level, text: ui.todayText.replace("{level}", ui.levels[level]).replace("{score}", String(fit.today![level].score)).replace("{scales}", fit.today![level].scales.map((x) => `${scaleName(x.key)} ${x.value}`).join(", ")) }))
    : [];

  return {
    industry,
    name: text.name,
    blurb: text.blurb,
    overall: fit.overall,
    rankLine: ui.rankLine.replace("{industry}", text.name).replace("{rank}", String(rank)).replace("{total}", String(ranking.length)),
    alsoTitle: ui.alsoTitle,
    also,
    alsoNone: also.length ? null : ui.alsoNone,
    pairTitle: ui.pairTitle,
    pairText,
    todayTitle: today.length ? ui.todayTitle : null,
    today,
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

export interface IndustryTeaser { industry: IndustryKey; name: string; overall: number; roles: Array<{ name: string; score: number }>; more: number }

/** A taste of one industry for the pitch at the top of the report: the fit and the three best role names. No texts. */
export function industryTeaser(industry: IndustryKey, types: Array<{ key: string; value: number }>, t: Dict): IndustryTeaser | null {
  const fit = industryFit(industry, types);
  if (!fit) return null;
  const text = textsFor(t)[industry];
  return { industry, name: text.name, overall: fit.overall, roles: fit.roles.slice(0, 3).map((r) => ({ name: text.roles[r.key]?.name ?? r.key, score: r.score })), more: Math.max(0, fit.roles.length - 3) };
}

export interface BestIndustry {
  /** How many industries were compared. */
  total: number;
  eyebrow: string;
  industry: IndustryKey;
  name: string;
  blurb: string;
  match: number;
  why: string;
  roleTitle: string;
  /** The person's best role in the winning industry, with why and where it sits. */
  role: ChapterRole;
  pathTitle: string;
  path: Array<{ level: Level; label: string; role: ChapterRole }>;
  scoresTitle: string;
  scores: Array<{ key: "peak" | "depth" | "typeFit"; label: string; value: number }>;
  scoresHelp: string;
  topTitle: string;
  topNote: string;
  bestTag: string;
  explore: string;
  /** The five best industries from different fields, the winner first, each with its field and its strongest role. */
  top: Array<{ key: IndustryKey; name: string; sector: string; blurb: string; match: number; role: string }>;
  openChapter: string;
  note: string;
}

/**
 * The best-industry finder as it leaves the server: every industry compared (lib/industries.ts industryMatches), the
 * winner explained with its best role and the path to it, and the closest alternatives. The winner's full chapter is
 * opened by the same purchase and read through the chapter route. Null unless all eight types were scored.
 */
export function bestIndustry(types: Array<{ key: string; value: number }>, t: Dict, locale: string): BestIndustry | null {
  const five = topIndustries(types);
  if (!five?.length) return null;
  const [top] = five;
  const chapter = industryChapter(top.industry, types, t, locale);
  if (!chapter) return null;
  const texts = textsFor(t);
  const f = t.finder.result;
  const n = String(INDUSTRY_KEYS.length);
  const roleName = (industry: IndustryKey, key: string) => texts[industry]?.roles[key]?.name ?? key;
  return {
    total: INDUSTRY_KEYS.length,
    eyebrow: f.eyebrow.replace("{n}", n),
    industry: top.industry,
    name: chapter.name,
    blurb: chapter.blurb,
    match: top.match,
    why: f.why.replace("{n}", n).replace("{industry}", chapter.name).replace("{peak}", String(top.peak)).replace("{depth}", String(top.depth)).replace("{typeFit}", String(top.typeFit)),
    roleTitle: f.roleTitle,
    role: chapter.roles[0],
    pathTitle: f.pathTitle,
    path: chapter.path,
    scoresTitle: f.scoresTitle,
    scores: [
      { key: "peak", label: f.scores.peak, value: top.peak },
      { key: "depth", label: f.scores.depth, value: top.depth },
      { key: "typeFit", label: f.scores.typeFit, value: top.typeFit },
    ],
    scoresHelp: f.scoresHelp,
    topTitle: f.topTitle,
    topNote: f.topNote,
    bestTag: f.bestTag,
    explore: f.explore,
    top: five.map((m) => ({
      key: m.industry, name: texts[m.industry]?.name ?? m.industry, sector: t.finder.sectors[sectorOf(m.industry)], blurb: texts[m.industry]?.blurb ?? "", match: m.match,
      role: f.otherRole.replace("{role}", roleName(m.industry, m.best.key)).replace("{score}", String(m.best.score)),
    })),
    openChapter: f.openChapter.replace("{industry}", chapter.name),
    note: f.note,
  };
}
