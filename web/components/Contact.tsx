"use client";

import Link from "next/link";
import { useState } from "react";
import { CONTACT_TOPIC_LINKS, mailto } from "@/lib/contact";
import type { Dict } from "@/lib/i18n";

/**
 * The contact block on the landing page. One mailbox, but the visitor picks a topic first: the email then opens
 * with a subject line the support box can sort by, a hint on what to include, and a link to the page that often
 * answers the question without an email at all. The address can be copied for people whose browser has no mail app.
 */
export function Contact({ t, email, site, locale, signedIn }: { t: Dict["contact"]; email: string; site: string; locale: string; signedIn: boolean }) {
  const [topic, setTopic] = useState(0);
  const [copied, setCopied] = useState(false);
  const topics = [
    ...t.topics.map((x, i) => ({ ...x, link: CONTACT_TOPIC_LINKS[i] ?? null })),
    { ...t.other, linkLabel: null, link: null },
  ];
  const current = topics[topic] ?? topics[0];
  const body = `${t.greeting}\n\n\n\n${t.sentFrom.replace("{site}", site).replace("{lang}", locale)}`;
  const href = mailto(email, current.subject, body);
  const firstStep = current.link ? (current.link.needsAccount && !signedIn ? "/sign-in" : current.link.href) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copy, email);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium">{t.title}</h2>
        <p className="mt-4 leading-relaxed text-ink-2">{t.lead}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={href} className="btn">{t.write}</a>
          <button type="button" onClick={copy} className="btn btn-quiet" aria-live="polite">{copied ? t.copied : t.copy}</button>
        </div>
        <a href={href} className="mt-5 inline-block break-all font-mono text-lg text-accent-text hover:underline">{email}</a>
        <p className="mt-2 text-xs text-muted">{t.reply}</p>
      </div>

      <div>
        <p className="text-sm font-semibold">{t.topicsLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {topics.map((x, i) => (
            <button key={x.label} type="button" role="tab" aria-selected={i === topic} onClick={() => setTopic(i)} className={`pill ${i === topic ? "pill-on" : "pill-off"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="soft-panel mt-4 p-5 sm:p-6" role="tabpanel">
          <p className="eyebrow !text-accent-text">{t.subjectLabel}</p>
          <p className="mt-1 font-semibold">{current.subject}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{current.hint}</p>
          {firstStep && current.linkLabel && (
            <p className="mt-4 text-sm">
              <span className="text-muted">{t.firstStep}: </span>
              <Link href={firstStep} className="font-semibold text-accent-text">{current.linkLabel} →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
