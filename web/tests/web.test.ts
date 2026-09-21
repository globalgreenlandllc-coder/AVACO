import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { en } from "@/lib/i18n/en";
import { ru } from "@/lib/i18n/ru";
import { bandOf, emostateRows, failureKind, leadingTypes, psytypeRows, summaryLines } from "@/lib/report";
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
    expect(organizer.details.map((d) => d.title)).toEqual(["What your score means", "The type in brief", "Strengths", "Worth watching", "How to talk with this type", "Where it shines"]);
    expect(organizer.details[2].items).toHaveLength(3);
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
