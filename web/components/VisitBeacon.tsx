"use client";
/**
 * Tells /api/visit which page opened, once per page: the numbers behind Admin → Statistics. Nothing personal leaves
 * the browser: the page, the window width, the language, and for the visit as a whole where it came from.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function VisitBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    let session = "", landing = false, from: { referrer?: string; utmSource?: string | null; utmCampaign?: string | null } = {};
    try {
      session = sessionStorage.getItem("avoco-visit") ?? "";
      if (!session) {
        const params = new URLSearchParams(location.search);
        session = crypto.randomUUID(); landing = true;
        sessionStorage.setItem("avoco-visit", session);
        sessionStorage.setItem("avoco-from", JSON.stringify({ referrer: document.referrer, utmSource: params.get("utm_source"), utmCampaign: params.get("utm_campaign") }));
      }
      from = JSON.parse(sessionStorage.getItem("avoco-from") ?? "{}");
    } catch { session = ""; }
    const body = JSON.stringify({ path: pathname, session, landing, referrer: from.referrer ?? "", utmSource: from.utmSource ?? null, utmCampaign: from.utmCampaign ?? null, width: window.innerWidth, locale: document.documentElement.lang });
    const sent = navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }));
    if (!sent) fetch("/api/visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
  }, [pathname]);
  return null;
}
