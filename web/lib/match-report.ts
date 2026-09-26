/** The match as it leaves the server: every string already in the visitor's language. Pure. */
import type { Dict } from "./i18n";
import { matchEn, type MatchText } from "./i18n/match-en";
import { matchRu } from "./i18n/match-ru";
import { pairKey, type MatchFit } from "./match";

export interface MatchReport {
  names: { a: string; b: string };
  score: number;
  band: { key: MatchFit["band"]; title: string; text: string };
  hearts: { count: number; note: string; a: { name: string; value: number }; b: { name: string; value: number } };
  reasons: string[];
  categories: Array<{ key: string; name: string; blurb: string; score: number; a: string; b: string; note: string | null; tip: string }>;
  roles: Array<{ key: string; name: string; text: string; held: boolean }>;
  today: string[];
  strengthsTitle: string; watchTitle: string; strengths: string[]; watch: string[];
  method: string;
}

const textsFor = (locale: string): MatchText => (locale === "ru" ? matchRu : matchEn);

export function matchReport(fit: MatchFit, names: { a: string; b: string }, t: Dict, locale: string): MatchReport {
  const m = textsFor(locale);
  const ui = t.match;
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const [la, lb] = fit.leaders;

  const categories = fit.categories.map((c) => {
    const text = m.categories[c.key];
    return {
      key: c.key, name: text.name, blurb: text.blurb, score: c.score,
      a: ui.brings.replace("{name}", names.a).replace("{what}", text.brings[c.a.type]),
      b: ui.brings.replace("{name}", names.b).replace("{what}", text.brings[c.b.type]),
      note: m.frictions[`${c.key}:${c.pair}`] ?? null,
      tip: text.tip,
    };
  });
  const sorted = [...categories].sort((x, y) => y.score - x.score);
  const strengths = sorted.slice(0, 3), watch = sorted.slice(-2).reverse();
  const band = m.bands[fit.band];
  const reasons = [
    ui.reasonHearts.replace("{a}", typeName(la)).replace("{b}", typeName(lb)).replace("{note}", m.pairNotes[pairKey(la, lb)] ?? "").replace("{hearts}", String(fit.hearts)),
    ui.reasonStrength.replace("{list}", strengths.map((c) => `${c.name} ${c.score}`).join(", ")),
    ui.reasonWatch.replace("{list}", watch.map((c) => `${c.name} ${c.score}`).join(", ")),
  ];
  const roles = fit.roles.map((r) => ({ key: r.role, name: m.roles[r.role].name, held: r.who !== null, text: r.who ? m.roles[r.role].text.replace("{name}", r.who === "a" ? names.a : names.b) : m.roles[r.role].none }));
  const today: string[] = [];
  for (const [who, name] of [["a", names.a], ["b", names.b]] as const) {
    const d = fit.today[who];
    if (!d) continue;
    today.push((d.calm < 35 ? m.today.tense : d.warmth < 30 ? m.today.reserved : m.today.steady).replace("{name}", name).replace("{calm}", String(d.calm)).replace("{warmth}", String(d.warmth)));
  }
  return {
    names, score: fit.score,
    band: { key: fit.band, title: band.title, text: band.text.replace("{a}", names.a).replace("{b}", names.b) },
    hearts: { count: fit.hearts, note: m.pairNotes[pairKey(la, lb)] ?? "", a: { name: typeName(la), value: fit.leaderScores[0] }, b: { name: typeName(lb), value: fit.leaderScores[1] } },
    reasons, categories, roles, today,
    strengthsTitle: ui.strengths, watchTitle: ui.watch, strengths: strengths.map((c) => c.name), watch: watch.map((c) => c.name),
    method: ui.method,
  };
}
