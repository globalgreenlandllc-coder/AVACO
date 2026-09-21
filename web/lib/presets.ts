/**
 * Industry presets. One engine for everyone; a preset only changes wording, which parts of a report
 * the company sees first, and the safeguards that industry needs. Texts live in lib/i18n/org-*.ts.
 */
export const PRESETS = ["general", "hiring", "team", "sales", "callcenter", "coaching", "education"] as const;
export type PresetKey = (typeof PRESETS)[number];
export const isPreset = (v: unknown): v is PresetKey => typeof v === "string" && (PRESETS as readonly string[]).includes(v);

/** What the "focus" box at the top of a company's view of a report is built from, in order. */
export type FocusKind = "fit" | "strengths" | "watch" | "communicate" | "management" | "wantToHear" | "decisions" | "stressState" | "stressTriggers" | "exitStress";

export const PRESET_RULES: Record<PresetKey, { focus: FocusKind[]; decisionNotice: boolean; minorsConsent: boolean; suggestHideEmotions: boolean }> = {
  general: { focus: ["strengths", "communicate", "fit"], decisionNotice: false, minorsConsent: false, suggestHideEmotions: false },
  hiring: { focus: ["fit", "strengths", "watch", "management"], decisionNotice: true, minorsConsent: false, suggestHideEmotions: true },
  team: { focus: ["communicate", "strengths", "watch", "management"], decisionNotice: false, minorsConsent: false, suggestHideEmotions: true },
  sales: { focus: ["communicate", "wantToHear", "decisions"], decisionNotice: false, minorsConsent: false, suggestHideEmotions: false },
  callcenter: { focus: ["stressState", "stressTriggers", "exitStress", "communicate"], decisionNotice: true, minorsConsent: false, suggestHideEmotions: false },
  coaching: { focus: ["stressState", "strengths", "watch", "exitStress"], decisionNotice: false, minorsConsent: false, suggestHideEmotions: false },
  education: { focus: ["fit", "communicate", "strengths"], decisionNotice: true, minorsConsent: true, suggestHideEmotions: true },
};
