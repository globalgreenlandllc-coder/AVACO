/**
 * The "in focus" box a company sees above a person's report: the parts of the report its industry
 * cares about most, for the person's strongest type. Drawn from the same content as the report itself.
 */
import type { Dict } from "./i18n/en";
import type { TypeProfile } from "./i18n/types-ru";
import { PRESET_RULES, type PresetKey } from "./presets";
import { bandOf, fitRows, type DetailSection, type ScaleRow } from "./report";

const STRESS_SCALES = ["stress_tolerance", "person_harmonicity", "self_control", "energy_level"];

export function focusSections(preset: PresetKey, psy: ScaleRow[], emo: ScaleRow[], t: Dict): DetailSection[] {
  const top = psy[0];
  if (!top) return [];
  const profiles = t.types.profiles as Record<string, TypeProfile>;
  const full = Object.hasOwn(profiles, top.key) ? profiles[top.key].full : undefined;
  const readings = t.deep.psytypes as Record<string, { strengths: string[]; watch: string[]; communicate: string; role: string }>;
  const reading = Object.hasOwn(readings, top.key) ? readings[top.key] : undefined;
  const ui = t.types.ui;
  const of = (title: string) => `${title} · ${top.name}`;

  const build: Record<string, () => DetailSection | null> = {
    fit: () => {
      const fits = fitRows(psy, t).slice(0, 3);
      return fits.length ? { title: t.deep.fit.title, items: fits.map((f) => `${f.name}: ${f.score}`) } : null;
    },
    strengths: () => (full ? { title: of(ui.strengths), items: full.team.strengths.slice(0, 6) } : reading ? { title: of(t.deep.ui.strengths), items: reading.strengths } : null),
    watch: () => (full ? { title: of(ui.risks), items: full.team.risks } : reading ? { title: of(t.deep.ui.watch), items: reading.watch } : null),
    communicate: () => (full ? { title: of(ui.interaction), items: full.communication.interaction } : reading ? { title: of(t.deep.ui.communicate), text: reading.communicate } : null),
    management: () => (full ? { title: of(ui.management), text: full.motivation.management } : null),
    wantToHear: () => (full ? { title: of(ui.wantToHear), chips: full.communication.wantToHear } : null),
    decisions: () => (full ? { title: of(ui.decisions), text: full.communication.decisions } : null),
    stressState: () => {
      const rows = STRESS_SCALES.map((key) => emo.find((e) => e.key === key)).filter((r): r is ScaleRow => Boolean(r));
      return rows.length ? { title: t.report.emoTitle, items: rows.map((r) => `${r.name}: ${r.value} (${t.deep.ui.bands[bandOf(r.value)].toLowerCase()})`) } : null;
    },
    stressTriggers: () => (full ? { title: of(ui.triggers), items: full.stress.triggers } : null),
    exitStress: () => (full ? { title: of(ui.exit), text: full.stress.exit } : null),
  };

  return PRESET_RULES[preset].focus.map((kind) => build[kind]()).filter((s): s is DetailSection => s !== null);
}
