import { describe, expect, it } from "vitest";
import { isNoisy } from "../components/Recorder";

// Frame levels in dBFS. Speech alternates loud words and quiet pauses; the pauses show the room.
const speechOver = (floor: number, voice: number, n = 300) => Array.from({ length: n }, (_, i) => (i % 3 === 0 ? floor + (i % 7) * 0.3 : voice - (i % 5) * 0.8));

describe("isNoisy", () => {
  it("passes a quiet room with a normal voice, whatever the microphone gain", () => {
    expect(isNoisy(speechOver(-60, -20))).toBe(false); // laptop, low gain
    expect(isNoisy(speechOver(-45, -8))).toBe(false); // phone, hot gain
    expect(isNoisy(speechOver(-70, -35))).toBe(false); // quiet speaker far from the mic
  });
  it("flags a loud room or a voice buried in it", () => {
    expect(isNoisy(speechOver(-28, -18))).toBe(true); // café: floor loud, voice barely above
    expect(isNoisy(speechOver(-40, -30))).toBe(true); // fan close to the mic: only 10 dB of voice
    expect(isNoisy(Array(300).fill(-25))).toBe(true); // a constant tone or hum, no pauses at all
  });
  it("says nothing on too little data", () => {
    expect(isNoisy([])).toBe(false);
    expect(isNoisy(Array(10).fill(-20))).toBe(false);
  });
});
