"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-renders the page from the server every few seconds, a limited number of times. Mounted while a payment
 * is confirmed in the background (the Stripe webhook), so the buyer sees the report open without pressing
 * refresh. It unmounts by itself once the server no longer renders it.
 */
export function RefreshWhile({ everyMs = 3000, times = 10 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let left = times;
    const timer = setInterval(() => {
      if (left-- <= 0) { clearInterval(timer); return; }
      router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, times]);
  return null;
}
