import { describe, expect, it } from "vitest";
import { summarizeRecordings, type Door, type RecordingRow } from "@/lib/recording-math";

const NOW = new Date("2026-10-01T18:00:00Z");
const H = 3_600_000;
const ad: Door = { source: "facebook", paid: true, campaign: "launch", content: "voice-video", term: "Facebook_Mobile_Feed", country: "US", region: "IL", city: "Chicago", device: "phone" };
const rec = (o: Partial<RecordingRow>): RecordingRow => ({
  id: Math.random().toString(36).slice(2), at: new Date(NOW.getTime() - H), status: "completed", error: null, kind: "own",
  leader: { key: "analyst", label: "Analyst", value: 60 }, outcome: "preview", matchKind: null, who: "Dana · dana@example.com", door: null, ...o,
});

describe("the recordings report", () => {
  it("counts what became of each recording: analysed, failed, opened free or paid, left at the preview", () => {
    const s = summarizeRecordings([
      rec({ outcome: "free", door: ad }),
      rec({ outcome: "paid", door: ad }),
      rec({ outcome: "preview" }),
      rec({ status: "failed", outcome: "failed", leader: null, error: "timeout" }),
      rec({ status: "processing", outcome: "waiting", leader: null }),
      rec({ kind: "partner", outcome: "included", matchKind: "couple", door: ad }),
      rec({ at: new Date(NOW.getTime() - 40 * 24 * H), outcome: "paid" }), // older than 30 days: left out
    ], NOW);
    expect(s).toMatchObject({ total: 6, analysed: 4, failed: 1, waiting: 1, opened: { free: 1, paid: 1, other: 1 }, previewOnly: 1 });
    expect(s.kinds.map((k) => [k.kind, k.recorded, k.analysed])).toEqual([["own", 5, 3], ["partner", 1, 1]]);
    expect(s.series.at(-1)).toEqual({ day: "2026-10-01", value: 6 });
  });

  it("credits recordings to the platform and the ad their person came from", () => {
    const s = summarizeRecordings([
      rec({ outcome: "free", door: ad }),
      rec({ outcome: "preview", door: ad }),
      rec({ outcome: "paid", door: { ...ad, source: "instagram", content: "couples-photo", term: "Instagram_Reels" } }),
      rec({ outcome: "preview", door: { ...ad, source: "direct", paid: false, campaign: null, content: null, term: null } }),
      rec({ kind: "partner-page", who: null }),
      rec({ door: null }),
    ], NOW);
    expect(s.sources.find((x) => x.source === "facebook")).toMatchObject({ recorded: 2, fromAds: 2, analysed: 2, opened: 1 });
    expect(s.sources.find((x) => x.source === "direct")).toMatchObject({ recorded: 1, fromAds: 0 });
    expect(s.sources.find((x) => x.source === "test")).toMatchObject({ label: "Free test sites", recorded: 1 });
    expect(s.sources.find((x) => x.source === "unknown")).toMatchObject({ recorded: 1 });
    expect(s.ads).toEqual([
      { source: "facebook", campaign: "launch", ad: "voice-video", placement: "Facebook_Mobile_Feed", recorded: 2, analysed: 2, opened: 1 },
      { source: "instagram", campaign: "launch", ad: "couples-photo", placement: "Instagram_Reels", recorded: 1, analysed: 1, opened: 1 },
    ]);
    expect(s.places[0]).toEqual({ label: "Chicago, IL, United States", n: 4 }); // the four with a known first visit
  });

  it("names the type each analysis found, and the hour in New York time", () => {
    const s = summarizeRecordings([
      rec({ leader: { key: "driver", label: "Driver", value: 70 }, at: new Date("2026-10-01T13:30:00Z") }), // 9:30 am in New York
      rec({ leader: { key: "driver", label: "Driver", value: 66 }, at: new Date("2026-10-01T13:50:00Z") }),
      rec({ leader: { key: "analyst", label: "Analyst", value: 58 } }),
    ], NOW);
    expect(s.types).toEqual([{ key: "driver", label: "Driver", n: 2 }, { key: "analyst", label: "Analyst", n: 1 }]);
    expect(s.hours[9].views).toBe(2);
  });
});
