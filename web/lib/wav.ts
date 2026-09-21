/**
 * Browser recordings come out as webm (Chrome) or mp4 (Safari); AVOCO wants wav, mp3, ogg, m4a or opus.
 * So every recording and uploaded file is decoded and re-encoded here as the format AVOCO
 * recommends: WAV, mono, 16-bit, 16 kHz. At that rate the 10 MB limit is a little over 5 minutes.
 */
export const SAMPLE_RATE = 16_000;
export const MIN_SECONDS = 30;
export const MAX_SECONDS = 300;

/** 16-bit PCM WAV from mono float samples in [-1, 1]. */
export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };

  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);             // fmt chunk size
  view.setUint16(20, 1, true);              // PCM
  view.setUint16(22, 1, true);              // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true);              // bytes per sample frame
  view.setUint16(34, 16, true);             // bits per sample
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export type AudioProblem = "decode" | "tooShort" | "tooLong";
export class AudioError extends Error {
  constructor(public problem: AudioProblem) { super(problem); }
}

/** Decodes any audio the browser can play, mixes to mono, resamples to 16 kHz. Browser only. */
export async function toAnalysisWav(source: Blob): Promise<{ wav: Blob; seconds: number }> {
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await source.arrayBuffer());
  } catch {
    throw new AudioError("decode");
  } finally {
    void ctx.close();
  }

  if (decoded.duration < MIN_SECONDS) throw new AudioError("tooShort");
  if (decoded.duration > MAX_SECONDS + 2) throw new AudioError("tooLong");

  // Rendering into a mono 16 kHz offline context does the downmix and the resampling in one pass.
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
  const node = offline.createBufferSource();
  node.buffer = decoded;
  node.connect(offline.destination);
  node.start();
  const rendered = await offline.startRendering();

  return { wav: new Blob([encodeWav(rendered.getChannelData(0))], { type: "audio/wav" }), seconds: decoded.duration };
}
