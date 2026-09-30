"use client";
/**
 * PostHog in the browser: session replays and page views, only with analytics consent, never for an admin's browser.
 * Inputs are masked. Recording runs on the pages that lead to a report (the landing page, sign-up, the recorder,
 * credits) and stops on a report's own pages, so nobody's results are ever in a replay. The visitor is identified
 * by the same short id the live map uses, so a pin there can open their recordings.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

const PRIVATE = [/^\/reports\//, /^\/match\//, /^\/m\//, /^\/partners\/r\//, /^\/gift\//, /^\/g\//, /^\/w\//];

export function PostHogInit({ apiKey, host, enabled, visitor }: { apiKey: string; host: string; enabled: boolean; visitor: string | null }) {
  const pathname = usePathname();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled) { if (started.current) posthog.opt_out_capturing(); return; }
    if (!started.current) {
      posthog.init(apiKey, {
        api_host: host,
        capture_pageview: "history_change",
        capture_pageleave: true,
        person_profiles: "identified_only",
        autocapture: true,
        disable_session_recording: true,
        session_recording: { maskAllInputs: true, maskTextSelector: "[data-ph-mask]" },
      });
      started.current = true;
    } else if (posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing();
    }
    if (visitor) posthog.identify(visitor);
  }, [apiKey, host, enabled, visitor]);

  // Record the way to a report; never a report.
  useEffect(() => {
    if (!enabled || !started.current || !pathname) return;
    if (PRIVATE.some((re) => re.test(pathname))) posthog.stopSessionRecording();
    else posthog.startSessionRecording();
  }, [pathname, enabled]);

  return null;
}
