"use client";
/**
 * Tells /api/visit which page opened, once per page: the numbers behind Admin → Statistics. Nothing personal leaves
 * the browser: the page, the window width, the language, and for the visit as a whole where it came from.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The ad click ids, most telling first: only which one was there is sent, never its value. */
const CLICK_PARAMS = ["ttclid", "twclid", "gclid", "gbraid", "wbraid", "msclkid", "fbclid"];

/** `enabled`: analytics is allowed for this visitor (lib/consent.ts); otherwise nothing is counted and no cookie is set. */
export function VisitBeacon({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!enabled || !pathname || pathname.startsWith("/admin")) return;
    let session = "", landing = false, from: { referrer?: string; utmSource?: string | null; utmCampaign?: string | null; utmMedium?: string | null; utmContent?: string | null; click?: string | null } = {};
    try {
      session = sessionStorage.getItem("avoco-visit") ?? "";
      if (!session) {
        const params = new URLSearchParams(location.search);
        session = crypto.randomUUID(); landing = true;
        sessionStorage.setItem("avoco-visit", session);
        sessionStorage.setItem("avoco-from", JSON.stringify({ referrer: document.referrer, utmSource: params.get("utm_source"), utmCampaign: params.get("utm_campaign"), utmMedium: params.get("utm_medium"), utmContent: params.get("utm_content"), click: CLICK_PARAMS.find((k) => params.has(k)) ?? null }));
      }
      from = JSON.parse(sessionStorage.getItem("avoco-from") ?? "{}");
    } catch { session = ""; }
    const body = JSON.stringify({ path: pathname, session, landing, referrer: from.referrer ?? "", utmSource: from.utmSource ?? null, utmCampaign: from.utmCampaign ?? null, utmMedium: from.utmMedium ?? null, utmContent: from.utmContent ?? null, click: from.click ?? null, width: window.innerWidth, locale: document.documentElement.lang });
    const sent = navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }));
    if (!sent) fetch("/api/visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
  }, [pathname, enabled]);
  return null;
}
