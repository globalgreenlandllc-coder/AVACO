"use client";
/**
 * The offer that follows a visitor down the landing page: the first report is free. It appears only once the hero's
 * own button has scrolled away above the screen, so the first screen shows one button, not two, and nothing covers
 * it; on a page without that button, after a third of the page. Steps aside for the cookie choices, and stays away for
 * the visit once closed.
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
    // The hero's button that is on screen at this width (the phone one or the wide one): the bar follows once it has gone by.
    const heroButton = () => [...document.querySelectorAll<HTMLElement>("[data-hero-cta]")].find((el) => el.getClientRects().length > 0) ?? null;
    const onScroll = () => {
      const button = heroButton();
      if (button ? button.getBoundingClientRect().bottom < 0 : window.scrollY > Math.min(700, document.body.scrollHeight * 0.3)) reveal();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // The cookie choices come first when they are open.
    const poll = setInterval(() => setBlocked(Boolean(document.querySelector("[role=dialog][aria-label='Your privacy choices']"))), 700);
    return () => { window.removeEventListener("scroll", onScroll); clearInterval(poll); };
  }, []);
  // Into <body> itself: a page wrapper with a transform or overflow would otherwise hold the bar inside it.
  if (!show || blocked) return null;
  return createPortal(
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:pb-5" role="complementary" aria-label={text}>
      <div className="cover flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 !rounded-2xl px-5 py-3.5 shadow-xl sm:px-6" style={{ boxShadow: "0 18px 60px rgba(0,0,0,.25)" }}>
        <p className="text-sm font-semibold sm:text-base"><span aria-hidden style={{ color: "var(--cover-gold)" }}>🎁 </span>{text}</p>
        <div className="flex items-center gap-2">
          <Link href={href} data-track="bar: start free" className="btn !px-5 !py-2 text-sm" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{cta}</Link>
          <button type="button" data-track="bar: not now" className="rounded-full px-3 py-2 text-sm opacity-80 hover:opacity-100" style={{ color: "var(--cover-muted)" }} onClick={() => { setShow(false); try { sessionStorage.setItem(KEY, "closed"); } catch { /* this page only */ } }}>{close}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
