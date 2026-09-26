"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

/** Send the gift link by email, by text, or through the phone's share sheet where there is one. */
export function ShareGift({ link, giver, recipient, message, t }: { link: string; giver: string; recipient: string; message: string; t: Dict["gift"]["giver"] }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);

  const body = t.emailBody.replace("{name}", recipient).replace("{link}", link).replace("{message}", message).replace("{giver}", giver).replace(/\n{3,}/g, "\n\n");
  const sms = t.smsBody.replace("{giver}", giver).replace("{link}", link);
  const mailto = `mailto:?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(body)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(sms)}`;

  async function share() {
    try { await navigator.share({ title: t.emailSubject, text: sms, url: link }); } catch { /* the person closed the sheet */ }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a href={mailto} className="btn btn-quiet">{t.email}</a>
      <a href={smsHref} className="btn btn-quiet">{t.text}</a>
      {canShare && <button type="button" className="btn btn-quiet" onClick={share}>{t.share}</button>}
    </div>
  );
}
