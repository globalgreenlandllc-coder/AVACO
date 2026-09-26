import { describe, expect, it } from "vitest";
import { stageOf } from "../lib/match-stage";

describe("stageOf", () => {
  it("walks invited → opened → recording → analysing → ready", () => {
    expect(stageOf({ openedAt: null, startedAt: null, analyses: [] })).toBe("invited");
    expect(stageOf({ openedAt: new Date(), startedAt: null, analyses: [] })).toBe("opened");
    expect(stageOf({ openedAt: new Date(), startedAt: new Date(), analyses: [] })).toBe("recording");
    expect(stageOf({ openedAt: new Date(), startedAt: new Date(), analyses: [{ status: "processing" }] })).toBe("analysing");
    expect(stageOf({ openedAt: null, startedAt: null, analyses: [{ status: "failed" }, { status: "completed" }] })).toBe("ready");
    expect(stageOf({ openedAt: null, startedAt: null, analyses: [{ status: "failed" }] })).toBe("analysing");
  });
});
