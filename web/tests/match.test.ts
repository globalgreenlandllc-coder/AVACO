import { describe, expect, it } from "vitest";
import { en } from "../lib/i18n/en";
import { matchEn } from "../lib/i18n/match-en";
import { matchRu } from "../lib/i18n/match-ru";
import { adjustedPairKeys, bandOf, CATEGORIES, hearts, matchFit, pairKey, ROLES, TYPE_KEYS } from "../lib/match";
import { deepReading, kindOf, THEMES } from "../lib/match-deep";
import { CATEGORY_SETS, MATCH_KINDS, matchWords } from "../lib/match-kind";
import { matchDeepEn } from "../lib/i18n/match-deep-en";
import { matchDeepRu } from "../lib/i18n/match-deep-ru";
import { ru } from "../lib/i18n/ru";
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

describe("closer up: the eight areas", () => {
  it("has a line for every type in every area, and every kind of pair, in both languages", () => {
    const kinds = ["contrast", "bothHigh", "bothLow", "aligned"] as const;
    for (const m of [matchDeepEn, matchDeepRu]) {
      for (const theme of THEMES) {
        for (const type of TYPE_KEYS) expect(m.themes[theme].stance[type], `${theme}/${type}`).toBeTruthy();
        for (const k of kinds) { expect(m.themes[theme].rub[k]).toContain("{sa}"); expect(m.themes[theme].help[k]).toBeTruthy(); }
      }
    }
  });

  it("tells far apart from same end from same way", () => {
    expect(kindOf("money", "catalyst", "skeptic")).toBe("contrast");
    expect(kindOf("money", "catalyst", "performer")).toBe("bothHigh");
    expect(kindOf("space", "analyst", "mediator")).toBe("bothLow");
    expect(kindOf("pace", "organizer", "harmonizer")).toBe("aligned");
  });

  it("reads a pair in the reader's language, with AVOCO's own texts on both sides", () => {
    for (const [t, lang] of [[en, "en"], [ru, "ru"]] as const) {
      const d = deepReading("analyst", "organizer", { a: "Dima", b: "Anna" }, t);
      expect(d.themes).toHaveLength(8);
      expect(d.avoco).toHaveLength(2); // both types have a full AVOCO profile, so both sides of its table speak
      for (const theme of d.themes) {
        expect(theme.rub).toContain("Dima"); expect(theme.rub).toContain("Anna");
        expect(theme.rub).not.toMatch(/\{\w+\}/); expect(theme.help).not.toMatch(/\{\w+\}/);
        expect(theme.a.points.length, `${lang} ${theme.key}`).toBeGreaterThan(0);
        expect(theme.b.points.length, `${lang} ${theme.key}`).toBeGreaterThan(0);
      }
      expect(d.themes.find((x) => x.key === "talk")?.kind).toBe("bothLow"); // analyst 15, organizer 35: two quiet people
      expect(d.themes.find((x) => x.key === "stress")?.kind).toBe("contrast"); // analyst turns inward (10), organizer outward (60)
    }
  });
});

describe("any kind of pair", () => {
  it("reads the areas that belong to the kind, and says every word for it", () => {
    for (const kind of MATCH_KINDS) for (const c of CATEGORY_SETS[kind]) expect(CATEGORIES).toContain(c);
    const a = profile("analyst", "skeptic"), b = profile("organizer", "driver");
    expect(matchFit(a, b, { kind: "business" })!.categories.map((c) => c.key).sort()).toEqual([...CATEGORY_SETS.business].sort());
    expect(matchFit(a, b, { kind: "couple", withFamily: true })!.categories.map((c) => c.key)).toContain("family");
    expect(matchFit(a, b, { kind: "family", withFamily: true })!.categories.map((c) => c.key)).not.toContain("romance");
    for (const m of [matchEn, matchRu]) for (const kind of MATCH_KINDS) { expect(m.kinds[kind].label).toBeTruthy(); expect(m.kinds[kind].who).toBeTruthy(); }
  });

  it("speaks of business partners, not of a couple, all the way down", () => {
    const fit = matchFit(profile("analyst", "skeptic"), profile("organizer", "driver"), { kind: "business" })!;
    const r = matchReport(fit, { a: "Dima", b: "Anna" }, en, "en", "business");
    expect(r.categories.map((c) => c.name)).toContain("Money and resources");
    expect(r.categories.map((c) => c.name)).not.toContain("Romance and attraction");
    expect(r.deep.themes.find((x) => x.key === "love")?.name).toBe("Working together");
    expect(r.deep.themes.find((x) => x.key === "love")?.a.points.join(" ")).toMatch(/partner|business/i);
    const words = matchWords(en.match, "business", matchEn.kinds);
    expect(words.title).toBe("How well do you work together?");
    expect(JSON.stringify(words)).not.toContain("couple's report");
    expect(words.partnerTitle).toBe("{a} invited you to a compatibility report");
    const friends = matchReport(matchFit(profile("catalyst", "driver"), profile("harmonizer", "mediator"), { kind: "friends" })!, { a: "Dima", b: "Anna" }, en, "en", "friends");
    expect(friends.deep.themes.find((x) => x.key === "love")?.name).toBe("Closeness and trust");
    expect(friends.deep.themes.find((x) => x.key === "love")?.rub).not.toContain("love");
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
