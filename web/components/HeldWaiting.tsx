"use client";
/**
 * Back from paying for a kept recording: the same analysing console as the report page, drawing the person's own
 * recording (its shape was kept with it, lib/held.ts). Once the report exists the shape is handed to the report page
 * and the browser moves on; until then the server page refreshes itself.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { forgetHeld, readHeld } from "@/lib/held";
import { Analysing } from "./Analysing";

export function HeldWaiting({ report, audioUrl, startedAt, status, t, thoughts }: { report: string | null; audioUrl: string | null; startedAt: number; status: string; t: Dict["report"]["live"]; thoughts: string[] }) {
  const router = useRouter();
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    const held = readHeld();
    const own = held && audioUrl && held.audioUrl === audioUrl && held.peaks?.length ? held.peaks : null;
    if (own) setPeaks(own);
    if (!report) return;
    try { if (own) sessionStorage.setItem(`avoco-wave:${report}`, JSON.stringify(own)); } catch { /* a stand-in is drawn */ }
    if (audioUrl) forgetHeld(audioUrl);
    router.replace(`/reports/${report}`);
  }, [report, audioUrl, router]);

  return (
    <div>
      <p role="status" className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent-soft px-4 py-1.5 text-sm font-semibold">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-ink" aria-hidden>✓</span>{status}
      </p>
      <Analysing t={t} startedAt={startedAt} thoughts={thoughts} peaks={peaks} />
    </div>
  );
}
