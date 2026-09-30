"use client";
/**
 * The conversion events that don't belong to one button (lib/track.ts): a new account (sign_up) and a confirmed
 * payment on the page Stripe sends people back to (purchase). Only on the main site; an admin's browser sends nothing.
 */
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { hashId, track } from "@/lib/track";

export function ConversionEvents({ off }: { off: boolean }) {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();

  useEffect(() => { window.__avocoNoTrack = off; }, [off]);

  // A new account: created within the last half hour and not announced from this browser yet.
  useEffect(() => {
    if (off || !isSignedIn || !user?.createdAt) return;
    if (Date.now() - new Date(user.createdAt).getTime() > 30 * 60_000) return;
    void hashId(user.id).then((h) => {
      // The server sends Meta its own copy of the same event (app/api/track/signup), which counts even where the pixel is blocked.
      if (track("sign_up", { event_id: `signup_${h}`, method: user.externalAccounts?.length ? "google" : "email" })) void fetch("/api/track/signup", { method: "POST", keepalive: true }).catch(() => undefined);
    });
  }, [off, isSignedIn, user]);

  // Back from Stripe (?session=cs_…): the purchase, once confirmed; the webhook can be a few seconds behind.
  useEffect(() => {
    if (off || !isSignedIn) return;
    const session = new URLSearchParams(window.location.search).get("session");
    if (!session?.startsWith("cs_")) return;
    let tries = 0, stop = false;
    const ask = async () => {
      if (stop || tries++ > 10) return;
      const res = await fetch(`/api/track/purchase?session=${encodeURIComponent(session)}`, { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? await res.json().catch(() => null) as { id?: string; value?: number; currency?: string; item?: string; pending?: boolean } | null : null;
      if (body?.id) {
        track("purchase", { event_id: `purchase_${body.id}`, value: body.value, currency: body.currency, item: body.item, ecommerce: { transaction_id: body.id, value: body.value, currency: body.currency, items: [{ item_id: body.item, item_name: body.item, price: body.value, quantity: 1 }] } });
      } else if (body?.pending) setTimeout(ask, 3000);
    };
    void ask();
    return () => { stop = true; };
  }, [off, isSignedIn, pathname]);

  return null;
}
