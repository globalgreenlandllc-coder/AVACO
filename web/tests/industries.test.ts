import { describe, expect, it } from "vitest";
import { en } from "../lib/i18n/en";
import { industriesEn } from "../lib/i18n/industries-en";
import { industriesRu } from "../lib/i18n/industries-ru";
import { INDUSTRIES, INDUSTRY_KEYS, industryFit, isIndustry, LEVELS } from "../lib/industries";
import { industryChapter, industryNames } from "../lib/industry-chapter";

const TYPES = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];
const profile = (over: Record<string, number>) => TYPES.map((key) => ({ key, value: over[key] ?? 15 }));

describe("industry catalogue", () => {
  it("has a name and a text in both languages for every industry and role", () => {
    for (const key of INDUSTRY_KEYS) {
      for (const texts of [industriesEn, industriesRu]) {
        expect(texts[key], key).toBeDefined();
        expect(texts[key].rewards).toHaveLength(3);
        expect(Object.keys(texts[key].roles).sort()).toEqual(Object.keys(INDUSTRIES[key]).sort());
      }
    }
    expect(Object.keys(industriesEn).sort()).toEqual([...INDUSTRY_KEYS].sort());
  });

  it("gives every industry a role at each level, with known types only", () => {
    for (const key of INDUSTRY_KEYS) {
      const roles = Object.values(INDUSTRIES[key]);
      for (const level of LEVELS) expect(roles.some((r) => r.level === level), `${key} ${level}`).toBe(true);
      for (const r of roles) for (const type of Object.keys(r.types)) expect(TYPES).toContain(type);
    }
    expect(isIndustry("construction")).toBe(true);
    expect(isIndustry("__proto__")).toBe(false);
  });
});

describe("industryFit", () => {
  it("ranks the roles a profile's strong types point at first", () => {
    const driver = industryFit("construction", profile({ driver: 80, organizer: 55 }))!;
    expect(["owner", "projectManager", "siteManager"]).toContain(driver.roles[0].key);
    expect(["owner", "projectManager"]).toContain(driver.path.lead.key);
    expect(driver.roles.at(-1)!.key).not.toBe("owner");
    const skeptic = industryFit("construction", profile({ skeptic: 85, analyst: 50 }))!;
    expect(["estimator", "safetyInspector"]).toContain(skeptic.roles[0].key);
    const harmonizer = industryFit("education", profile({ harmonizer: 80, mediator: 60 }))!;
    expect(["teacher", "tutor", "counsellor"]).toContain(harmonizer.roles[0].key);
  });

  it("scores on the 0 to 100 scale, one decimal, and needs all eight types", () => {
    const fit = industryFit("it", profile({ analyst: 70, skeptic: 40 }))!;
    for (const r of fit.roles) { expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); }
    expect(fit.roles[0].because[0].type).toBe("analyst");
    expect(industryFit("it", profile({}).slice(1))).toBeNull();
  });
});

describe("industryChapter", () => {
  it("returns everything already in the visitor's language", () => {
    const chapter = industryChapter("construction", profile({ catalyst: 78, driver: 46 }), en, "en")!;
    expect(chapter.name).toBe("Construction");
    expect(chapter.roles[0].name).toBeTruthy();
    expect(chapter.path.map((p) => p.level)).toEqual(["start", "grow", "lead"]);
    expect(chapter.angle).toContain("Catalyst side (78)");
    expect(chapter.watch.length).toBeGreaterThan(0);
    expect(chapter.roles[0].because).toMatch(/^Because: /);
    expect(industryNames("ru").find((i) => i.key === "construction")?.name).toBe("Строительство");
  });
});
