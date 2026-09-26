import { describe, expect, it } from "vitest";
import { en } from "../lib/i18n/en";
import { matchEn } from "../lib/i18n/match-en";
import { matchRu } from "../lib/i18n/match-ru";
import { adjustedPairKeys, bandOf, CATEGORIES, hearts, matchFit, pairKey, ROLES, TYPE_KEYS } from "../lib/match";
import { matchReport } from "../lib/match-report";

const profile = (lead: string, second: string, score = 65) => TYPE_KEYS.map((key) => ({ key, value: key === lead ? score : key === second ? 45 : 11 }));

describe("match content", () => {
  it("has every word in both languages", () => {
    for (const m of [matchEn, matchRu]) {
      for (const c of CATEGORIES) { expect(m.categories[c].name).toBeTruthy(); for (const t of TYPE_KEYS) expect(m.categories[c].brings[t], `${c}/${t}`).toBeTruthy(); }
      for (const a of TYPE_KEYS) for (const b of TYPE_KEYS) { expect(m.pairNotes[pairKey(a, b)], pairKey(a, b)).toBeTruthy(); expect(hearts(a, b)).toBeGreaterThanOrEqual(1); expect(hearts(a, b)).toBeLessThanOrEqual(5); }
      for (const k of adjustedPairKeys()) expect(m.frictions[k], k).toBeTruthy();
      for (const r of ROLES) expect(m.roles[r].text).toContain("{name}");
    }
    // AVOCO's official Catalyst row
    expect(hearts("catalyst", "organizer")).toBe(2); expect(hearts("catalyst", "harmonizer")).toBe(5); expect(matchEn.pairNotes["catalyst|driver"]).toBe("leaders duo");
  });
});

describe("matchFit", () => {
  it("is symmetric and bounded", () => {
    const ab = matchFit(profile("driver", "catalyst"), profile("harmonizer", "mediator"))!;
    const ba = matchFit(profile("harmonizer", "mediator"), profile("driver", "catalyst"))!;
    expect(ab.score).toBe(ba.score);
    expect(ab.score).toBeGreaterThan(0); expect(ab.score).toBeLessThanOrEqual(100);
    for (const c of ab.categories) { expect(c.score).toBeGreaterThanOrEqual(4); expect(c.score).toBeLessThanOrEqual(98); }
  });

  it("ranks pairs the way AVOCO's table does", () => {
    const good = matchFit(profile("catalyst", "driver"), profile("harmonizer", "mediator"))!;
    const hard = matchFit(profile("catalyst", "driver"), profile("analyst", "skeptic"))!;
    expect(good.score).toBeGreaterThan(hard.score);
    expect(good.hearts).toBe(5); expect(hard.hearts).toBe(2);
    expect(good.band).not.toBe("challenging");
  });

  it("assigns roles and reads today's tone", () => {
    const fit = matchFit(profile("driver", "catalyst"), profile("organizer", "skeptic"), { scalesA: [{ key: "stress_tolerance", value: 20 }, { key: "self_control", value: 30 }, { key: "person_harmonicity", value: 40 }, { key: "kindness", value: 60 }, { key: "emo_engage", value: 50 }], withFamily: true })!;
    expect(fit.roles.find((r) => r.role === "engine")?.who).toBe("a");
    expect(fit.roles.find((r) => r.role === "anchor")?.who).toBe("b");
    expect(fit.categories.map((c) => c.key)).toContain("family");
    expect(fit.today.a?.calm).toBe(30); expect(fit.today.b).toBeNull();
    expect(matchFit(profile("driver", "catalyst").slice(1), profile("organizer", "skeptic"))).toBeNull();
    expect(["natural", "strong", "complementary", "challenging"]).toContain(bandOf(fit.score));
  });
});

describe("matchReport", () => {
  it("is fully localized and uses the names", () => {
    const fit = matchFit(profile("catalyst", "driver"), profile("harmonizer", "mediator"), { withFamily: false })!;
    const r = matchReport(fit, { a: "Dima", b: "Anna" }, en, "en");
    expect(r.band.text).toContain("Dima"); expect(r.band.text).toContain("Anna");
    expect(r.categories).toHaveLength(8);
    expect(r.categories[0].a).toMatch(/^Dima brings /);
    expect(r.reasons[0]).toContain("Catalyst with Harmonizer is 5 of 5");
    expect(r.roles.some((x) => x.text.includes("Dima") || x.text.includes("Anna"))).toBe(true);
    expect(r.today).toEqual([]);
  });
});
