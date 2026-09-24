import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { fieldFits, FIELDS, SECTORS, STATE_SHARE } from "@/lib/fit";
import { bandOf, emostateRows, failureKind, fitRows, leadingTypes, psytypeRows, summaryLines, zoneOf } from "@/lib/report";
import { encodeWav } from "@/lib/wav";

describe("report rows", () => {
  const psy = [
    { key: "driver", label: "Driver", value: 70.2, zone: "leading" as const },
    { key: "performer", label: "Performer", value: 45, zone: "active" as const },
    { key: "brand_new_type", label: "brand_new_type", value: 12, zone: "background" as const },
  ];

  it("localizes known scales and keeps the gateway's order", () => {
    expect(psytypeRows(psy, ru).map((r) => r.name)).toEqual(["Драйвер", "Артист", "brand_new_type"]);
    expect(psytypeRows(psy, en)[0]).toMatchObject({ name: "Driver", value: 70.2, zone: "leading" });
  });

  it("shows an unknown scale under the gateway's label, without a description", () => {
    expect(psytypeRows(psy, ru)[2]).toEqual({ key: "brand_new_type", name: "brand_new_type", text: null, value: 12, zone: "background", tag: "Фоновый", details: [] });
    expect(emostateRows([{ key: "constructor", label: "constructor", value: 1 }], en)[0].name).toBe("constructor");
  });

  it("finds leading types, and none for a balanced profile", () => {
    expect(leadingTypes(psytypeRows(psy, en)).map((r) => r.key)).toEqual(["driver"]);
    expect(leadingTypes(psytypeRows(psy.slice(1), en))).toEqual([]);
  });
});

describe("explanations", () => {
  const psy = [
    { key: "organizer", label: "Organizer", value: 88.6, zone: "leading" as const },
    { key: "catalyst", label: "Catalyst", value: 45, zone: "active" as const },
    { key: "skeptic", label: "Skeptic", value: 8, zone: "background" as const },
  ];
  const emo = [["expressivity", 73], ["emo_engage", 71], ["authority", 68], ["energy_level", 50], ["person_harmonicity", 27], ["self_control", 12]]
    .map(([key, value]) => ({ key: key as string, label: key as string, value: value as number }));

  it("explains a type relative to the person's own score and zone", () => {
    const [organizer, catalyst, skeptic] = psytypeRows(psy, en);
    expect(organizer.details[0].text).toContain("88.6");
    expect(organizer.details[0].text).toContain("leading zone");
    expect(catalyst.details[0].text).toContain("active zone");
    expect(skeptic.details[0].text).toContain("background zone");
  });

  it("gives every type AVOCO's official description", () => {
    const all = Object.keys(en.psytypes).map((key) => ({ key, label: key, value: 40, zone: "active" as const }));
    for (const dict of [en, ru]) {
      for (const row of psytypeRows(all, dict)) {
        expect(row.details[1].title).toBe(dict.types.ui.overview);
        expect(row.details[1].text!.length).toBeGreaterThan(400);
      }
    }
    // The three my first draft got wrong, now as AVOCO defines them.
    expect(en.types.profiles.mediator.overview).toContain("rich inner world");
    expect(en.types.profiles.skeptic.overview).toContain("self-criticism");
    expect(en.types.profiles.analyst.overview).toContain("original thinking");
  });

  it("shows the full original report for a type that has one, chapter by chapter", () => {
    const catalyst = psytypeRows(psy, en)[1];
    const chapters = [...new Set(catalyst.details.map((d) => d.group).filter(Boolean))];
    expect(chapters).toEqual(["Role in the team", "Motivation and psychological need", "Attitude toward resources", "Communication type", "Behaviour under stress", "Relationships", "Compatibility"]);

    const section = (title: string) => catalyst.details.find((d) => d.title === title)!;
    expect(section("Key strengths").items).toHaveLength(13);
    expect(section("Risks").items).toHaveLength(6);
    expect(section("Their vocabulary").chips).toHaveLength(16);
    expect(section("What they want to hear").chips).toHaveLength(8);
    expect(section("Second stage of stress").quote).toBe("Pattern: I would have done it better, but I'm surrounded by incompetents");
    expect(section("Compatibility").ratings).toEqual(expect.arrayContaining([
      { name: "Organizer", score: 2, label: "2 of 5", note: "structure interferes" },
      { name: "Harmonizer", score: 5, label: "5 of 5", note: "support each other" },
    ]));
    expect(section("Compatibility").ratings).toHaveLength(8);
    expect(psytypeRows(psy, ru)[1].details).toHaveLength(catalyst.details.length);
  });

  it("opens the Analyst's full official report, chapter by chapter, in both languages", () => {
    const rows = psytypeRows([{ key: "analyst", label: "Analyst", value: 61, zone: "leading" }], en);
    const chapters = [...new Set(rows[0].details.map((d) => d.group).filter(Boolean))];
    expect(chapters).toEqual(["Role in the team", "Motivation and psychological need", "Attitude toward resources", "Communication type", "Behaviour under stress", "Relationships", "Compatibility"]);
    const section = (title: string) => rows[0].details.find((d) => d.title === title)!;
    expect(section("Key strengths").items).toHaveLength(14);
    expect(section("Their vocabulary").chips).toHaveLength(16);
    expect(section("Second stage of stress").quote).toBe("Pattern: Nobody needs me, let them decide for themselves");
    expect(section("Compatibility").ratings).toEqual(expect.arrayContaining([
      { name: "Analyst", score: 5, label: "5 of 5", note: "respect for space" },
      { name: "Mediator", score: 4, label: "4 of 5", note: "deep understanding" },
      { name: "Performer", score: 2, label: "2 of 5", note: "too bright" },
    ]));
    expect(rows[0].details.some((d) => d.title === "Full AVOCO report")).toBe(false); // no "not added yet" note any more
    const ru_ = psytypeRows([{ key: "analyst", label: "Analyst", value: 61, zone: "leading" }], ru)[0];
    expect(ru_.details).toHaveLength(rows[0].details.length);
  });

  it("opens the full official reports of the Organizer, the Performer and the Skeptic", () => {
    const cases = [
      { key: "organizer", strengths: 11, chips: 16, pattern: "If you want something done right, do it yourself", best: { name: "Organizer", score: 5, label: "5 of 5", note: "very similar" } },
      { key: "performer", strengths: 13, chips: 15, pattern: "I wanted to do the right thing, but they didn't understand me", best: { name: "Catalyst", score: 5, label: "5 of 5", note: "happy partnership" } },
      { key: "skeptic", strengths: 16, chips: 16, pattern: "Follow the rules and everything will be fine", best: { name: "Harmonizer", score: 5, label: "5 of 5", note: "deep acceptance" } },
    ] as const;
    for (const c of cases) {
      const row = psytypeRows([{ key: c.key, label: c.key, value: 55, zone: "leading" }], en)[0];
      const chapters = [...new Set(row.details.map((d) => d.group).filter(Boolean))];
      expect(chapters).toEqual(["Role in the team", "Motivation and psychological need", "Attitude toward resources", "Communication type", "Behaviour under stress", "Relationships", "Compatibility"]);
      const section = (title: string) => row.details.find((d) => d.title === title)!;
      expect(section("Key strengths").items).toHaveLength(c.strengths);
      expect(section("Their vocabulary").chips).toHaveLength(c.chips);
      expect(section("Second stage of stress").quote).toBe(`Pattern: ${c.pattern}`);
      expect(section("Compatibility").ratings).toHaveLength(8);
      expect(section("Compatibility").ratings).toEqual(expect.arrayContaining([c.best]));
      expect(row.details.some((d) => d.title === "Full AVOCO report")).toBe(false);
      const ru_ = psytypeRows([{ key: c.key, label: c.key, value: 55, zone: "leading" }], ru)[0];
      expect(ru_.details).toHaveLength(row.details.length);
    }
    // the compatibility tables agree with each other: A's rating of B equals B's rating of A
    const score = (a: string, b: string) => (en.types.profiles as Record<string, { full?: { compatibility: Record<string, { score: number }> } }>)[a].full!.compatibility[b].score;
    for (const a of ["catalyst", "analyst", "organizer", "performer", "skeptic"]) for (const b of ["catalyst", "analyst", "organizer", "performer", "skeptic"]) expect(score(a, b)).toBe(score(b, a));
  });

  it("falls back to a short reading, and says so, for a type without its full report yet", () => {
    const driver = psytypeRows([{ key: "driver", label: "Driver", value: 70, zone: "leading" }], en)[0];
    expect(driver.details.map((d) => d.title)).toEqual(["What your score means", "About this type", "Strengths", "Worth watching", "How to talk with this type", "Where it shines", "Full AVOCO report"]);
    expect(driver.details.at(-1)).toEqual({ title: "Full AVOCO report", note: en.types.ui.partialNote }); // its own entry, after the reading
    expect(driver.details.at(-2)!.note).toBeUndefined();
    expect(driver.details.some((d) => d.group)).toBe(false);
  });

  it("reads an emotional scale by band: high from 60, moderate from 35, low below", () => {
    expect([100, 60, 59.9, 35, 34.9, 0].map(bandOf)).toEqual(["high", "high", "mid", "mid", "low", "low"]);
    const rows = emostateRows(emo, en);
    expect(rows[0]).toMatchObject({ tag: "High" });
    expect(rows[0].details[0].text).toBe(en.deep.emostate.expressivity.high);
    expect(rows[3].details[0].text).toBe(en.deep.emostate.energy_level.mid);
    expect(rows[5].details[0].text).toBe(en.deep.emostate.self_control.low);
    expect(rows[5].details[0].title).toBe("What your score means: low (12)");
  });

  it("writes the summary from the scores alone", () => {
    // psy has only three of the eight types here, so there is no work-fit line (it needs all eight).
    expect(summaryLines(psytypeRows(psy, en), emostateRows(emo, en), en)).toEqual([
      "Leading: Organizer (88.6).",
      "Active alongside: Catalyst (45).",
      "Most expressed right now: Expressiveness (73), Inspiration (71), Dominance (68).",
      "Least expressed right now: Self-control (12), Composure (27), Cheerfulness (50).",
    ]);
    expect(summaryLines(psytypeRows(psy.slice(2), ru), [], ru)).toEqual(["Ни один тип не достигает ведущей зоны. Сильнее всего выражены: Скептик (8)."]);
  });

  it("has a full explanation for every AVOCO type and scale, in both languages", () => {
    for (const dict of [en, ru]) {
      expect(Object.keys(dict.deep.psytypes).sort()).toEqual(Object.keys(dict.psytypes).sort());
      expect(Object.keys(dict.deep.emostate).sort()).toEqual(Object.keys(dict.emostate).sort());
    }
  });
});

describe("zones", () => {
  it("follow the value shown, even when an older stored zone disagrees", () => {
    expect([50, 49.9, 30, 29.9].map(zoneOf)).toEqual(["leading", "active", "active", "background"]);
    // A report stored before the rounding fix: shown as 30, stored as background.
    const [row] = psytypeRows([{ key: "organizer", label: "Organizer", value: 30, zone: "background" }], en);
    expect(row).toMatchObject({ zone: "active", tag: "Active" });
    expect(row.details[0].text).toContain("active zone");
  });
});

describe("where you can do your best work", () => {
  // The scores from a real report: a leading Analyst with an active Mediator, low on energy that day.
  const scores = [["analyst", 56.4], ["mediator", 45], ["organizer", 30], ["harmonizer", 20.5], ["performer", 9.4], ["skeptic", 8.7], ["driver", 8.3], ["catalyst", 7.4]]
    .map(([key, value]) => ({ key: key as string, label: key as string, value: value as number }));
  const state = [["ability_to_attract", 76], ["openness_to_new", 73], ["ability_to_assert", 70], ["kindness", 66], ["ability_to_set_goals", 65], ["person_harmonicity", 58], ["emo_engage", 56], ["expressivity", 56], ["self_control", 48], ["emotional_confidence", 47], ["person_manifestation", 46], ["stress_tolerance", 44], ["authority", 34], ["energy_level", 12]]
    .map(([key, value]) => ({ key: key as string, label: key as string, value: value as number }));
  const avg = (pairs: Array<[number, number]>) => pairs.reduce((s, [w, v]) => s + w * v, 0) / pairs.reduce((s, [w]) => s + w, 0);

  it("scores every field from the personality types, three quarters, and the emotional scales, one quarter", () => {
    const fits = fieldFits(scores, state);
    expect(fits).toHaveLength(Object.keys(FIELDS).length);
    expect(fits.length).toBeGreaterThanOrEqual(25);

    const research = fits.find((f) => f.key === "research")!;
    const personality = avg([[1, 56.4], [0.4, 8.7], [0.2, 45]]);
    const rightNow = avg([[1, 73], [0.7, 70], [0.6, 48]]);
    expect(research.typeScore).toBeCloseTo(personality, 1);
    expect(research.stateScore).toBeCloseTo(rightNow, 1);
    expect(research.score).toBeCloseTo((1 - STATE_SHARE) * personality + STATE_SHARE * rightNow, 1);
    expect(research.sector).toBe("tech");
    expect(research.types.map((d) => d.key)).toEqual(["analyst", "mediator", "skeptic"]); // strongest contribution first
    expect(fits.map((f) => f.score)).toEqual([...fits.map((f) => f.score)].sort((a, b) => b - a));
  });

  it("puts an introverted original thinker with an empathic second type in research, IT and the arts, and last on a stage or in sales", () => {
    const order = fieldFits(scores, state).map((f) => f.key);
    expect(order.slice(0, 3)).toEqual(["research", "it", "arts"]);
    expect(order.slice(3, 6).sort()).toEqual(["counselling", "design", "social"]); // the active Mediator: ideals and empathy
    expect(order.slice(-2).sort()).toEqual(["sales", "stage"]);
  });

  it("lets today's state move a score, but not overturn the personality", () => {
    const calm = state.map((s) => (["stress_tolerance", "self_control", "kindness", "person_harmonicity"].includes(s.key) ? { ...s, value: 95 } : s));
    const tense = state.map((s) => (["stress_tolerance", "self_control", "kindness", "person_harmonicity"].includes(s.key) ? { ...s, value: 5 } : s));
    const service = (emo: typeof state) => fieldFits(scores, emo).find((f) => f.key === "service")!;
    expect(service(calm).score).toBeGreaterThan(service(tense).score);
    expect(service(calm).typeScore).toBe(service(tense).typeScore);
    expect(service(calm).score - service(tense).score).toBeLessThanOrEqual(100 * STATE_SHARE); // a quarter at most
  });

  it("falls back to personality alone without emotional scales (a workspace that hides them)", () => {
    const fits = fieldFits(scores);
    expect(fits.every((f) => f.stateScore === null && f.score === f.typeScore && f.scales.length === 0)).toBe(true);
    expect(fieldFits(scores, [])).toEqual(fits);
    expect(fieldFits(scores, state.slice(0, 3)).find((f) => f.key === "research")!.stateScore).toBeNull(); // incomplete scales are not guessed
  });

  it("stays on the 0 to 100 scale of the API", () => {
    const flat = (v: number) => fieldFits(scores.map((x) => ({ ...x, value: v })), state.map((x) => ({ ...x, value: v }))).map((f) => f.score);
    expect(new Set(flat(100))).toEqual(new Set([100]));
    expect(new Set(flat(0))).toEqual(new Set([0]));
  });

  it("says nothing unless all eight types were scored", () => {
    expect(fieldFits(scores.slice(0, 7), state)).toEqual([]);
    expect(fitRows(psytypeRows(scores.slice(0, 3), en), en)).toEqual([]);
  });

  it("explains each score in the reader's language: sector, example roles, and what it came from", () => {
    const [top] = fitRows(psytypeRows(scores, en), en, emostateRows(state, en));
    expect(top.name).toBe("Research and science");
    expect(top.sector).toBe("Technical and analytical");
    expect(top.roles).toBe("Roles: Researcher, scientist, academic, R&D specialist");
    expect(top.because).toMatch(/^Personality [\d.]+: Analyst 56\.4, Mediator 45, Skeptic 8\.7 · Right now [\d.]+: Openness to experience 73, Independence 70, Self-control 48$/);

    const hidden = fitRows(psytypeRows(scores, ru), ru)[0];
    expect(hidden.because).toMatch(/^Тип личности [\d.]+: Аналитик 56\.4, Медиатор 45, Скептик 8\.7$/);
    expect(summaryLines(psytypeRows(scores, en), emostateRows(state, en), en).find((l) => l.startsWith("Best fit for work"))).toContain("Research and science");
  });

  it("uses only real AVOCO type and scale names, and has a name, text and roles for every field in both languages", () => {
    for (const rule of Object.values(FIELDS)) {
      for (const type of Object.keys(rule.types)) expect(Object.keys(en.psytypes)).toContain(type);
      for (const scale of Object.keys(rule.scales)) expect(Object.keys(en.emostate)).toContain(scale);
      expect(SECTORS).toContain(rule.sector);
    }
    for (const dict of [en, ru]) {
      expect(Object.keys(dict.deep.fit.fields).sort()).toEqual(Object.keys(FIELDS).sort());
      expect(Object.keys(dict.deep.fit.sectors).sort()).toEqual([...SECTORS].sort());
    }
    // every type and every scale matters somewhere
    const used = (pick: "types" | "scales") => new Set(Object.values(FIELDS).flatMap((r) => Object.keys(r[pick])));
    expect(used("types").size).toBe(8);
    expect(used("scales").size).toBe(14);
  });
});

describe("failure wording", () => {
  it.each([
    ["timeout", "timeout"],
    ["psytype: Audio is shorter than 30 seconds", "audio"],
    ["psytype: AVOCO returned no result", "audio"],
    ["emostate: AVOCO is unavailable, try again later", "generic"],
    ["psytype: internal error", "generic"],
    [null, "generic"],
  ])("%s -> %s", (error, kind) => expect(failureKind(error)).toBe(kind));
});

describe("translations", () => {
  const shape = (v: unknown): unknown => (Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : "text");

  it("Russian has exactly the same keys as English", () => expect(shape(ru)).toEqual(shape(en)));

  it("covers every AVOCO scale in both languages", () => {
    for (const dict of [en, ru]) {
      expect(Object.keys(dict.psytypes)).toHaveLength(8);
      expect(Object.keys(dict.emostate)).toHaveLength(14);
    }
  });

  it("leaves nothing untranslated", () => {
    const flat = (v: unknown): string[] => (typeof v === "string" ? [v] : Object.values(v as object).flatMap(flat));
    const english = new Set(flat(en));
    expect(flat(ru).filter((s) => english.has(s))).toEqual(["AVOCO"]);
  });
});

describe("default language", () => {
  it("is English for everyone; the switch, not the browser, chooses Russian", async () => {
    const mod = await import("@/lib/i18n");
    expect("pickFromHeader" in mod).toBe(false);
    expect(mod.isLocale("ru") && mod.isLocale("en")).toBe(true);
    expect(mod.isLocale("kk")).toBe(false);
  });
});

describe("encodeWav", () => {
  it("writes a valid 16 kHz mono 16-bit PCM header", () => {
    const view = new DataView(encodeWav(new Float32Array(16_000)));
    const tag = (o: number) => String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(o + i)));
    expect([tag(0), tag(8), tag(12), tag(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(view.byteLength).toBe(44 + 32_000);
    expect(view.getUint32(4, true)).toBe(36 + 32_000);
    expect(view.getUint16(20, true)).toBe(1);        // PCM
    expect(view.getUint16(22, true)).toBe(1);        // mono
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);   // byte rate
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(32_000);
  });

  it("scales and clips samples", () => {
    const view = new DataView(encodeWav(new Float32Array([0, 1, -1, 0.5, 2, -2])));
    const sample = (i: number) => view.getInt16(44 + i * 2, true);
    expect([0, 1, 2, 3, 4, 5].map(sample)).toEqual([0, 32767, -32768, 16383, 32767, -32768]);
  });

  it("keeps five minutes under the gateway's 10 MB limit", () => {
    expect(44 + 300 * 16_000 * 2).toBeLessThan(10 * 1024 * 1024);
  });
});
