"use client";
/**
 * Meta's pixel between pages (lib/meta-pixel.ts). The first page view comes from the pixel's own code in <head>
 * (app/layout.tsx); each later page of the visit is a PageView from here. If advertising is allowed only after the
 * page has loaded, the pixel starts here; if it is withdrawn, the pixel is told to stop.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { loadMetaPixel } from "@/lib/meta-pixel";

export function MetaPixelEvents({ pixelId, enabled }: { pixelId: string | null; enabled: boolean }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!pixelId) return;
    if (!enabled) { window.fbq?.("consent", "revoke"); return; }
    if (window.fbq) window.fbq("consent", "grant");
    else loadMetaPixel(pixelId); // sends this page's view itself
  }, [pixelId, enabled]);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // the first view went with the base code
    if (enabled && pixelId) window.fbq?.("track", "PageView");
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
