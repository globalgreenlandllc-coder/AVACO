import { describe, expect, it } from "vitest";
import { detectPitch, peaksOf, roomOf, syntheticPeaks } from "@/lib/waveform";

const sine = (hz: number, rate: number, n: number, amp = 0.3) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

describe("voice signal helpers", () => {
  it("draws the shape of a recording, loudest slice first", () => {
    const ramp = Float32Array.from({ length: 1000 }, (_, i) => i / 1000);
    const peaks = peaksOf(ramp, 10);
    expect(peaks).toHaveLength(10);
    expect(peaks.at(-1)).toBe(1);
    expect(peaks[0]).toBeLessThan(peaks[5]);
    expect(peaksOf([], 10)).toEqual([]);
  });

  it("hears the pitch of a voice-like tone, and nothing in silence or noise", () => {
    expect(detectPitch(sine(150, 16000, 1024), 16000)).toBeCloseTo(150, -1);
    expect(detectPitch(sine(220, 16000, 1024), 16000)).toBeCloseTo(220, -1);
    // a voice has overtones: still the fundamental, not an octave off
    const voiced = Float32Array.from({ length: 1024 }, (_, i) => 0.25 * Math.sin((2 * Math.PI * 120 * i) / 16000) + 0.15 * Math.sin((2 * Math.PI * 240 * i) / 16000) + 0.08 * Math.sin((2 * Math.PI * 360 * i) / 16000));
    expect(detectPitch(voiced, 16000)).toBeCloseTo(120, -1);
    expect(detectPitch(new Float32Array(1024), 16000)).toBeNull();
    let seed = 3;
    const noise = Float32Array.from({ length: 1024 }, () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.6);
    expect(detectPitch(noise, 16000)).toBeNull();
  });

  it("grades the room like the recorder's warning does", () => {
    expect(roomOf(-60)).toBe("quiet");
    expect(roomOf(-45)).toBe("fair");
    expect(roomOf(-30)).toBe("noisy");
  });

  it("makes the same stand-in shape every time", () => {
    expect(syntheticPeaks(120)).toEqual(syntheticPeaks(120));
    expect(syntheticPeaks(120).every((v) => v > 0 && v <= 1)).toBe(true);
  });
});
