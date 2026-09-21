import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { fieldFits, FIELDS } from "@/lib/fit";
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

  it("falls back to a short reading, and says so, for a type without its full report yet", () => {
    const organizer = psytypeRows(psy, en)[0];
    expect(organizer.details.map((d) => d.title)).toEqual(["What your score means", "About this type", "Strengths", "Worth watching", "How to talk with this type", "Where it shines", "Full AVOCO report"]);
    expect(organizer.details.at(-1)).toEqual({ title: "Full AVOCO report", note: en.types.ui.partialNote }); // its own entry, after the reading
    expect(organizer.details.at(-2)!.note).toBeUndefined();
    expect(organizer.details.some((d) => d.group)).toBe(false);
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
  // The scores from a real report: a leading Analyst with an active Mediator.
  const scores = [["analyst", 56.4], ["mediator", 45], ["organizer", 30], ["harmonizer", 20.5], ["performer", 9.4], ["skeptic", 8.7], ["driver", 8.3], ["catalyst", 7.4]]
    .map(([key, value]) => ({ key: key as string, label: key as string, value: value as number }));

  it("ranks every field by the weighted average of the types behind it", () => {
    const fits = fieldFits(scores);
    expect(fits).toHaveLength(Object.keys(FIELDS).length);
    expect(fits.slice(0, 3).map((f) => f.key)).toEqual(["research", "arts", "helping"]);
    expect(fits[0].score).toBeCloseTo((56.4 * 1 + 8.7 * 0.4) / 1.4, 1); // 42.8
    expect(fits[1].score).toBeCloseTo((45 * 0.8 + 56.4 * 0.6 + 9.4 * 0.4 + 20.5 * 0.3) / 2.1, 1); // 38
    expect(fits.at(-1)).toMatchObject({ key: "sales", score: 8.1 }); // (7.4 + 0.5 × 8.3 + 0.5 × 9.4) / 2
    expect(fits.map((f) => f.score)).toEqual([...fits.map((f) => f.score)].sort((a, b) => b - a));
  });

  it("stays on the 0 to 100 scale of the types", () => {
    const flat = (v: number) => fieldFits(scores.map((s) => ({ ...s, value: v }))).map((f) => f.score);
    expect(new Set(flat(100))).toEqual(new Set([100]));
    expect(new Set(flat(0))).toEqual(new Set([0]));
  });

  it("says nothing unless all eight types were scored", () => {
    expect(fieldFits(scores.slice(0, 7))).toEqual([]);
    expect(fitRows(psytypeRows(scores.slice(0, 3), en), en)).toEqual([]);
  });

  it("names the types behind each score, strongest contribution first, in the reader's language", () => {
    const [top] = fitRows(psytypeRows(scores, en), en);
    expect(top).toMatchObject({ name: "Research, engineering and IT", score: 42.8, because: "Based on: Analyst 56.4, Skeptic 8.7" });
    expect(fitRows(psytypeRows(scores, ru), ru)[0].because).toBe("На основе: Аналитик 56.4, Скептик 8.7");
    expect(summaryLines(psytypeRows(scores, en), [], en)).toContain("Best fit for work: Research, engineering and IT (42.8), Art, writing and creative craft (38).");
  });

  it("uses only real type names, and has a name and text for every field in both languages", () => {
    for (const weights of Object.values(FIELDS)) for (const type of Object.keys(weights)) expect(Object.keys(en.psytypes)).toContain(type);
    for (const dict of [en, ru]) expect(Object.keys(dict.deep.fit.fields).sort()).toEqual(Object.keys(FIELDS).sort());
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

describe("locale detection", () => {
  it("picks Russian for ru/kk/be/uk browsers and English otherwise", async () => {
    const { pickFromHeader } = await import("@/lib/i18n");
    expect(pickFromHeader("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(pickFromHeader("kk-KZ,kk;q=0.9")).toBe("ru");
    expect(pickFromHeader("en-US,en;q=0.9,ru;q=0.5")).toBe("en");
    expect(pickFromHeader("de")).toBe("en");
    expect(pickFromHeader(null)).toBe("en");
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
