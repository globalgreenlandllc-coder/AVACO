/**
 * A recording kept at the paywall (components/Recorder.tsx): already uploaded, waiting for a credit. Remembered in
 * this browser for a week, with its shape, so the analysing screen after the payment draws the person's own voice
 * (components/HeldWaiting.tsx). Browser only; every access survives blocked storage.
 */
export interface Held { audioUrl: string; person: string | null; at: number; peaks?: number[] | null }
export const HELD_KEY = "avoco-held-recording";
const HELD_DAYS = 7;

export function readHeld(): Held | null {
  try {
    const v = JSON.parse(localStorage.getItem(HELD_KEY) ?? "null") as Held | null;
    return v && typeof v.audioUrl === "string" && typeof v.at === "number" && Date.now() - v.at < HELD_DAYS * 86_400_000 ? v : null;
  } catch { return null; }
}

export function keepHeld(h: Held): void {
  try { localStorage.setItem(HELD_KEY, JSON.stringify(h)); } catch { /* the panel still works for this visit */ }
}

/** Forgets the kept recording; with `audioUrl`, only when it is that one. */
export function forgetHeld(audioUrl?: string): void {
  try {
    if (audioUrl && readHeld()?.audioUrl !== audioUrl) return;
    localStorage.removeItem(HELD_KEY);
  } catch { /* nothing was kept */ }
}
