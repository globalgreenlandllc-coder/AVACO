import { describe, expect, it } from "vitest";
import { agreementBand, consensus } from "../lib/consensus";

const TYPES = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];
const take = (id: string, day: number, lead: string, score: number, second: string) => ({
  id, created_at: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  psytype: TYPES.map((key) => ({ key, label: key, value: key === lead ? score : key === second ? 45 : 10 })),
});

describe("consensus", () => {
  it("needs at least two recordings", () => {
    expect(consensus([])).toBeNull();
    expect(consensus([take("a", 1, "analyst", 60, "mediator")])).toBeNull();
  });

  it("averages the scores and names the type that leads on average, with its agreement", () => {
    const c = consensus([take("a", 1, "analyst", 60, "mediator"), take("b", 2, "organizer", 88, "catalyst"), take("c", 3, "analyst", 65, "mediator"), take("d", 4, "analyst", 58, "mediator")])!;
    expect(c.n).toBe(4);
    expect(c.leader).toBe("analyst");
    expect(c.scores[0]).toMatchObject({ key: "analyst", value: 48.3, zone: "active" });
    expect(c.scores[1].key).toBe("mediator"); // 45,10,45,45 → 36.3
    expect(c.agreement).toBe(0.75);
    expect(c.recordings.map((r) => r.id)).toEqual(["d", "c", "b", "a"]); // newest first
    expect(c.recordings[2]).toMatchObject({ key: "organizer", value: 88 });
  });

  it("ignores recordings without a full set of types", () => {
    const broken = { id: "x", created_at: "2026-09-05T10:00:00.000Z", psytype: [{ key: "driver", label: "driver", value: 70 }] };
    expect(consensus([take("a", 1, "driver", 60, "catalyst"), broken])).toBeNull();
    expect(consensus([take("a", 1, "driver", 60, "catalyst"), take("b", 2, "driver", 70, "catalyst"), broken])!.n).toBe(2);
  });

  it("bands the agreement", () => {
    expect([1, 0.75, 0.6, 0.5, 0.4].map(agreementBand)).toEqual(["high", "high", "medium", "medium", "low"]);
  });
});
