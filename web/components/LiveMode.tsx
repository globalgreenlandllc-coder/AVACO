"use client";
/**
 * Live mode for Admin → Statistics: the whole page reads its numbers again every 15 seconds while its tab is visible,
 * and at once when the tab comes back. A refresh keeps what is open on the page (the map's zoom, a chosen pin, a
 * half-typed campaign name). Switched off, it stays off in this browser.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const KEY = "avoco-stats-live";

export function LiveMode({ every = 15 }: { every?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [clock, setClock] = useState(() => Date.now());
  const [updating, startTransition] = useTransition();
  const last = useRef(Date.now());
  useEffect(() => { try { if (localStorage.getItem(KEY) === "off") setOn(false); } catch { /* on */ } }, []);
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(() => {
    last.current = Date.now();
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, every * 1000);
    const onShow = () => { if (document.visibilityState === "visible" && Date.now() - last.current > 5000) refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [on, every, refresh]);

  const toggle = () => { const next = !on; setOn(next); try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* this visit only */ } if (next) refresh(); };
  const since = Math.max(0, Math.round((clock - last.current) / 1000));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm" role="status" aria-live="off">
      <span className="relative grid h-3 w-3 place-items-center" aria-hidden>
        {on && <span className="breathe absolute inset-0 rounded-full" style={{ background: "#2fa35a" }} />}
        <span className="relative h-2 w-2 rounded-full" style={{ background: on ? "#2fa35a" : "var(--muted)" }} />
      </span>
      <span className="font-semibold">{on ? "Live mode" : "Live mode off"}</span>
      <span className="text-xs text-muted tabular-nums">{updating ? "updating…" : on ? `updated ${since}s ago · every ${every} s` : `numbers as of ${since}s ago`}</span>
      <button type="button" onClick={refresh} className="rounded-full px-2 text-base text-ink-2 hover:bg-accent-soft" title="Update now" aria-label="Update now">↻</button>
      <button type="button" onClick={toggle} className="btn btn-quiet !px-3 !py-1 text-xs">{on ? "Pause" : "Turn on"}</button>
    </div>
  );
}
