"use client";
/**
 * Tells /api/visit which page opened, once per page: the numbers behind Admin → Statistics. Nothing personal leaves
 * the browser: the page, the window width, the language, and for the visit as a whole where it came from. Then, for
 * the same page, a few follow-ups to /api/visit/engage: how long it has been on screen, how much of it was scrolled
 * into view, and on the public pages which button or link was tapped, by its label, never anything typed.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The ad click ids, most telling first: only which one was there is sent, never its value. */
const CLICK_PARAMS = ["ttclid", "twclid", "gclid", "gbraid", "wbraid", "msclkid", "fbclid"];
/** The public pages, where a tapped control's own label is kept; elsewhere a label could carry a person's name. */
const PUBLIC_PAGE = /^\/($|sample$|technology$|credits$|gift$|docs\/api$|privacy$|terms$|partners$|sign-(up|in)(\/|$))/;
/** Seconds on screen that each send a follow-up as they are reached. */
const MARKS = [5, 15, 60];

const post = (url: string, body: string) => {
  const sent = navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
  if (!sent) fetch(url, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
};

/** A tapped control as the statistics name it: its data-track name, or its label and, for a link, where it leads. */
function labelOf(el: Element): string {
  const named = el.closest("[data-track]")?.getAttribute("data-track");
  if (named) return named;
  const text = (el.getAttribute("aria-label") || (el as HTMLElement).innerText || "").replace(/\s+/g, " ").trim().slice(0, 30);
  const href = el.getAttribute("href");
  if (!href) return text || el.tagName.toLowerCase();
  let where = href;
  try { const u = new URL(href, location.href); where = u.origin === location.origin ? `${u.pathname}${u.hash}` : u.hostname; } catch { /* as written */ }
  return `${text || "link"} → ${where}`;
}

/** `enabled`: analytics is allowed for this visitor (lib/consent.ts); otherwise nothing is counted and no cookie is set. */
export function VisitBeacon({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled || !pathname || pathname.startsWith("/admin")) return;
    let session = "", landing = false, from: { referrer?: string; utmSource?: string | null; utmCampaign?: string | null; utmMedium?: string | null; utmContent?: string | null; utmTerm?: string | null; click?: string | null } = {};
    try {
      session = sessionStorage.getItem("avoco-visit") ?? "";
      if (!session) {
        const params = new URLSearchParams(location.search);
        session = crypto.randomUUID(); landing = true;
        sessionStorage.setItem("avoco-visit", session);
        sessionStorage.setItem("avoco-from", JSON.stringify({ referrer: document.referrer, utmSource: params.get("utm_source"), utmCampaign: params.get("utm_campaign"), utmMedium: params.get("utm_medium"), utmContent: params.get("utm_content"), utmTerm: params.get("utm_term"), click: CLICK_PARAMS.find((k) => params.has(k)) ?? null }));
      }
      from = JSON.parse(sessionStorage.getItem("avoco-from") ?? "{}");
    } catch { session = ""; }
    post("/api/visit", JSON.stringify({ path: pathname, session, landing, referrer: from.referrer ?? "", utmSource: from.utmSource ?? null, utmCampaign: from.utmCampaign ?? null, utmMedium: from.utmMedium ?? null, utmContent: from.utmContent ?? null, utmTerm: from.utmTerm ?? null, click: from.click ?? null, width: window.innerWidth, locale: document.documentElement.lang }));
  }, [pathname, enabled]);

  // The follow-ups for this page: seconds on screen at 5, 15 and 60, each quarter of the page scrolled into view, a
  // tap, and the final numbers when the page is hidden or left. The server only ever raises what it has.
  useEffect(() => {
    if (!enabled || !pathname || pathname.startsWith("/admin")) return;
    let session = "";
    try { session = sessionStorage.getItem("avoco-visit") ?? ""; } catch { /* no follow-ups */ }
    if (!session) return;
    const path = pathname;
    let shownMs = 0, since: number | null = document.visibilityState === "visible" ? performance.now() : null;
    let deepest = 0, sentScroll = 0, mark = 0;
    const seconds = () => Math.round((shownMs + (since === null ? 0 : performance.now() - since)) / 1000);
    const send = (tap?: string) => post("/api/visit/engage", JSON.stringify({ session, path, seen: seconds(), scroll: deepest, ...(tap ? { tap } : {}) }));
    const measure = () => {
      const page = document.documentElement.scrollHeight;
      const pct = page > 0 ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / page) * 100)) : 100;
      if (pct > deepest) deepest = pct;
    };
    measure();
    const onScroll = () => { measure(); const step = Math.floor(deepest / 25) * 25; if (step > sentScroll) { sentScroll = step; send(); } };
    const tick = setInterval(() => {
      if (mark >= MARKS.length || seconds() < MARKS[mark]) return;
      while (mark < MARKS.length && seconds() >= MARKS[mark]) mark++;
      send();
    }, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { if (since !== null) { shownMs += performance.now() - since; since = null; } send(); }
      else if (since === null) since = performance.now();
    };
    const onClick = (e: MouseEvent) => {
      if (!PUBLIC_PAGE.test(path)) return;
      const el = (e.target as Element | null)?.closest?.("a[href], button, summary, [role=button]");
      if (el) send(labelOf(el));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);
    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
      send(); // leaving the page within the site: its final numbers
    };
  }, [pathname, enabled]);
  return null;
}
