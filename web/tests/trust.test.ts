import { describe, expect, it } from "vitest";
import { FACETS, trustReading } from "@/lib/trust";

const profile = (top: string, second: string, topValue = 70, secondValue = 45) =>
  ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"].map((key) => ({ key, value: key === top ? topValue : key === second ? secondValue : 10 }));

describe("trust reading", () => {
  it("needs all eight types", () => {
    expect(trustReading(profile("organizer", "analyst").slice(0, 7))).toBeNull();
    expect(trustReading([])).toBeNull();
  });

  it("reads an Organizer with an Analyst as rock-solid and a Catalyst with a Performer as moment-bound", () => {
    const solid = trustReading(profile("organizer", "analyst"))!;
    const loose = trustReading(profile("catalyst", "performer"))!;
    expect(solid.band).toBe("high");
    expect(loose.band).toBe("low");
    expect(solid.overall).toBeGreaterThan(loose.overall + 30);
    expect(solid.facets.find((f) => f.key === "promises")!.from).toEqual(["organizer", "analyst"]);
    expect(solid.leading).toBe("organizer");
  });

  it("keeps every score between 0 and 100 and covers the four facets", () => {
    for (const top of ["driver", "harmonizer", "skeptic", "mediator"]) {
      const r = trustReading(profile(top, "performer"))!;
      expect(r.facets.map((f) => f.key)).toEqual([...FACETS]);
      for (const f of r.facets) { expect(f.score).toBeGreaterThanOrEqual(0); expect(f.score).toBeLessThanOrEqual(100); }
    }
    // a Driver says what they mean more than they keep small promises
    const driver = trustReading(profile("driver", "catalyst"))!;
    expect(driver.facets.find((f) => f.key === "candor")!.score).toBeGreaterThan(driver.facets.find((f) => f.key === "promises")!.score);
  });
});
