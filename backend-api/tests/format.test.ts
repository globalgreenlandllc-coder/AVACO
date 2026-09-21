import { describe, expect, it } from "vitest";
import { formatEmostate, formatPsytype, parseScales, zoneOf } from "@/lib/format";

describe("zones", () => {
  it.each([[100, "leading"], [50, "leading"], [49.99, "active"], [30, "active"], [29.99, "background"], [0, "background"]])(
    "%d is %s", (value, zone) => expect(zoneOf(value)).toBe(zone),
  );

  it("uses the raw value, not the rounded one", () => {
    expect(formatPsytype([{ id: 1, name: "organizer", value: 49.96 }])).toEqual([{ key: "organizer", label: "Organizer", value: 50, zone: "active" }]);
  });
});

describe("formatting", () => {
  it("sorts psytypes by value desc, rounds to 1 decimal, labels them", () => {
    const out = formatPsytype([{ id: 6, name: "analyst", value: 12.34 }, { id: 2, name: "driver", value: 68.66 }, { id: 8, name: "mediator", value: 30 }]);
    expect(out).toEqual([
      { key: "driver", label: "Driver", value: 68.7, zone: "leading" },
      { key: "mediator", label: "Mediator", value: 30, zone: "active" },
      { key: "analyst", label: "Analyst", value: 12.3, zone: "background" },
    ]);
  });

  it("sorts emostate desc and rounds to integers", () => {
    const out = formatEmostate([{ id: 1, name: "energy_level", value: 41.4 }, { id: 10, name: "self_control", value: 83.6 }, { id: 28, name: "emo_engage", value: 83.5 }]);
    expect(out).toEqual([
      { key: "self_control", label: "Self-control", value: 84 },
      { key: "emo_engage", label: "Inspiration", value: 84 },
      { key: "energy_level", label: "Cheerfulness", value: 41 },
    ]);
  });

  it("passes unknown names through with label = name", () => {
    expect(formatPsytype([{ id: 99, name: "brand_new", value: 55 }])[0]).toMatchObject({ key: "brand_new", label: "brand_new", zone: "leading" });
    expect(formatEmostate([{ id: 99, name: "brand_new", value: 55 }])[0]).toEqual({ key: "brand_new", label: "brand_new", value: 55 });
  });

  it("does not mutate its input", () => {
    const input = [{ id: 1, name: "organizer", value: 1 }, { id: 2, name: "driver", value: 2 }];
    formatPsytype(input);
    expect(input[0].name).toBe("organizer");
  });
});

describe("parseScales", () => {
  it("drops malformed entries instead of crashing", () => {
    expect(parseScales([{ id: 1, name: "driver", value: 10 }, null, "x", { name: "no_value" }, { name: 5, value: 1 }, { name: "nan", value: NaN }]))
      .toEqual([{ id: 1, name: "driver", value: 10 }]);
  });

  it("returns null when there is no array at all", () => {
    expect(parseScales(undefined)).toBeNull();
    expect(parseScales({ error: "too short" })).toBeNull();
  });
});
