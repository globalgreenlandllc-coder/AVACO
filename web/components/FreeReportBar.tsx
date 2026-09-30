"use client";
/**
 * The offer that follows a visitor down the landing page: the first report is free. Appears once the person has read
 * a little (a third of the page, or six seconds), steps aside for the cookie choices, and stays away for the visit
 * once closed.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const KEY = "avoco-free-bar";

export function FreeReportBar({ text, cta, close, href }: { text: string; cta: string; close: string; href: string }) {
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem(KEY) === "closed") return; } catch { /* shown */ }
    let shown = false;
    const reveal = () => { if (!shown) { shown = true; setShow(true); } };
    const onScroll = () => { if (window.scrollY > Math.min(700, document.body.scrollHeight * 0.3)) reveal(); };
    // From an ad (a paid tag or an ad click id) or inside a social app's own browser: at once. Anyone else: after a short read.
    const q = new URLSearchParams(location.search);
    const fromAd = /^(paid|cpc|ppc|paid[_-]?social|ads?)$/i.test(q.get("utm_medium") ?? "") || ["fbclid", "ttclid", "twclid", "gclid"].some((k) => q.has(k)) || /FBAN|FBAV|Instagram|musical_ly|BytedanceWebview|Twitter/i.test(navigator.userAgent);
    const timer = setTimeout(reveal, fromAd ? 1200 : 6000);
    window.addEventListener("scroll", onScroll, { passive: true });
    // The cookie choices come first when they are open.
    const poll = setInterval(() => setBlocked(Boolean(document.querySelector("[role=dialog][aria-label='Your privacy choices']"))), 700);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); clearInterval(poll); };
  }, []);
  // Into <body> itself: a page wrapper with a transform or overflow would otherwise hold the bar inside it.
  if (!show || blocked) return null;
  return createPortal(
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:pb-5" role="complementary" aria-label={text}>
      <div className="cover flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 !rounded-2xl px-5 py-3.5 shadow-xl sm:px-6" style={{ boxShadow: "0 18px 60px rgba(0,0,0,.25)" }}>
        <p className="text-sm font-semibold sm:text-base"><span aria-hidden style={{ color: "var(--cover-gold)" }}>🎁 </span>{text}</p>
        <div className="flex items-center gap-2">
          <Link href={href} className="btn !px-5 !py-2 text-sm" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{cta}</Link>
          <button type="button" className="rounded-full px-3 py-2 text-sm opacity-80 hover:opacity-100" style={{ color: "var(--cover-muted)" }} onClick={() => { setShow(false); try { sessionStorage.setItem(KEY, "closed"); } catch { /* this page only */ } }}>{close}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
