/**
 * The voice signal as the recorder shows it: the shape of a recording (peaks), the live pitch, and how quiet the
 * room is. Pure functions, so they are tested (tests/waveform.test.ts); the browser-only decoding sits at the end.
 * Used by components/VoiceScope.tsx (live, while recording), Waveform.tsx and Analysing.tsx.
 */

/** `n` levels (0..1) across the samples, one per slice, the loudest slice 1: the shape of a recording. */
export function peaksOf(samples: ArrayLike<number>, n: number): number[] {
  if (samples.length === 0 || n <= 0) return [];
  const size = samples.length / n;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const from = Math.floor(i * size), to = Math.min(samples.length, Math.max(from + 1, Math.floor((i + 1) * size)));
    let sum = 0;
    for (let j = from; j < to; j++) sum += samples[j] * samples[j];
    out[i] = Math.sqrt(sum / (to - from));
  }
  const max = Math.max(...out) || 1;
  return out.map((v) => Math.round((v / max) * 1000) / 1000);
}

/**
 * The fundamental frequency of one frame by normalised autocorrelation, or null when the frame is quiet or has no
 * clear period (unvoiced sounds, noise). `min`..`max` Hz is the range of speaking voices.
 */
export function detectPitch(samples: ArrayLike<number>, sampleRate: number, min = 70, max = 400): number | null {
  const n = samples.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i] * samples[i];
  if (Math.sqrt(energy / n) < 0.01) return null;
  const minLag = Math.max(2, Math.floor(sampleRate / max)), maxLag = Math.min(Math.floor(sampleRate / min), Math.floor(n / 2));
  if (maxLag <= minLag) return null;
  const r = new Array<number>(maxLag + 1).fill(0);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < n - lag; i++) { sum += samples[i] * samples[i + lag]; e1 += samples[i] * samples[i]; e2 += samples[i + lag] * samples[i + lag]; }
    r[lag] = sum / (Math.sqrt(e1 * e2) || 1);
    if (r[lag] > best) best = r[lag];
  }
  if (best < 0.7) return null;
  // The shortest lag nearly as good as the best one: the period itself, not twice it.
  let lag = minLag;
  while (lag < maxLag && r[lag] < best * 0.9) lag++;
  while (lag < maxLag && r[lag + 1] > r[lag]) lag++;
  // A parabola through the neighbours puts the peak between samples.
  const a = r[lag - 1] ?? r[lag], b = r[lag], c = r[lag + 1] ?? r[lag];
  const shift = a - 2 * b + c === 0 ? 0 : (0.5 * (a - c)) / (a - 2 * b + c);
  return sampleRate / (lag + shift);
}

export type Room = "quiet" | "fair" | "noisy";
/** The room from its noise floor in dBFS (the quiet tenth of the frames): the same limits as the recorder's warning. */
export const roomOf = (floorDb: number): Room => (floorDb < -50 ? "quiet" : floorDb < -38 ? "fair" : "noisy");

/** A recording-like shape when the real one isn't at hand: the same on the server and in the browser. */
export function syntheticPeaks(n = 120): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = 0.35 + 0.3 * Math.sin(i * 0.9) * Math.sin(i * 0.23 + 1) + 0.25 * Math.abs(Math.sin(i * 2.1 + 0.4)) + 0.1 * Math.sin(i * 5.3);
    return Math.round(Math.min(1, Math.max(0.06, v)) * 1000) / 1000;
  });
}

/** The shape of a recorded clip, decoded in the browser; null when it can't be read (a video the browser won't open) or is too big to preview. */
export async function peaksFromBlob(blob: Blob, n = 160): Promise<number[] | null> {
  if (typeof AudioContext === "undefined" || blob.size > 60 * 1024 * 1024) return null;
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    return peaksOf(decoded.getChannelData(0), n);
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}
