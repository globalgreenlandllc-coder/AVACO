"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { emostateRows, failureKind, fitRows, leadingTypes, psytypeRows, summaryLines } from "@/lib/report";
import { Bars } from "./Bars";
import { CountUp, Reveal } from "./Motion";
import { Profile } from "./Profile";
import { Radar } from "./Radar";

export interface Report {
  id: string;
  status: "processing" | "completed" | "failed";
  created_at: string;
  psytype: Array<{ key: string; label: string; value: number; zone: "leading" | "active" | "background" }> | null;
  emostate: Array<{ key: string; label: string; value: number }> | null;
  error: string | null;
}

const POLL_MS = 4000;

export interface ReportViewProps {
  initial: Report;
  recordedOn: string;
  t: Dict;
  /** Defaults are the signed-in person's own report. A company view and a participant's link pass their own. */
  pollUrl?: string;
  /** null hides the delete button. */
  deleteUrl?: string | null;
  afterDeleteHref?: string;
  deleteLabel?: string;
  deleteConfirm?: string;
  back?: { href: string; label: string } | null;
  /** Rendered under the heading: a company's focus box, notices. */
  lead?: React.ReactNode;
  /** Leaves out the emotional-state section (a workspace setting). */
  hideEmotions?: boolean;
}

export function ReportView({ initial, recordedOn, t, pollUrl, deleteUrl, afterDeleteHref = "/reports", deleteLabel, deleteConfirm, back, lead, hideEmotions = false }: ReportViewProps) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const r = t.report;
  const poll = pollUrl ?? `/api/analyses/${initial.id}`;
  const del = deleteUrl === undefined ? `/api/analyses/${initial.id}` : deleteUrl;
  const backLink = back === undefined ? { href: "/reports", label: r.back } : back;

  // While AVOCO works, ask again every few seconds. The result arrives on the gateway's webhook.
  useEffect(() => {
    if (report.status !== "processing") return;
    const timer = setInterval(async () => {
      const res = await fetch(poll, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setReport(await res.json());
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [poll, report.status]);

  async function remove() {
    if (!del || !window.confirm(deleteConfirm ?? r.deleteConfirm)) return;
    setDeleting(true);
    const res = await fetch(del, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push(afterDeleteHref);
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {backLink && <Link href={backLink.href} className="no-print text-sm text-muted hover:text-ink">← {backLink.label}</Link>}
        <p className="eyebrow mt-6">{r.title}</p>
        <p className="mt-2 text-sm text-ink-2">{r.recordedOn}: {recordedOn}</p>
      </div>
    </div>
  );

  if (report.status === "processing") {
    return (
      <div>
        {heading}
        <div className="card mt-8 flex flex-col items-center px-7 py-20 text-center" aria-live="polite">
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="breathe absolute inset-0 rounded-full bg-accent" aria-hidden />
            <span className="relative h-10 w-10 rounded-full bg-accent" aria-hidden />
          </div>
          <h1 className="mt-10 font-display text-4xl font-medium">{r.processingTitle}</h1>
          <p className="mt-4 max-w-md leading-relaxed text-ink-2">{r.processingText}</p>
        </div>
      </div>
    );
  }

  if (report.status === "failed") {
    const kind = failureKind(report.error);
    return (
      <div>
        {heading}
        <div className="card mt-8 px-7 py-14 text-center">
          <h1 className="font-display text-4xl font-medium">{r.failedTitle}</h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-2">{kind === "audio" ? r.failedAudio : kind === "timeout" ? r.failedTimeout : r.failedGeneric}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/record" className="btn">{r.tryAgain}</Link>
            {del && <button type="button" className="btn btn-quiet" onClick={remove} disabled={deleting}>{deleting ? r.deleting : deleteLabel ?? r.delete}</button>}
          </div>
        </div>
      </div>
    );
  }

  const psy = psytypeRows(report.psytype ?? [], t);
  const emo = hideEmotions ? [] : emostateRows(report.emostate ?? [], t);
  const leaders = leadingTypes(psy);
  const top = psy[0];
  // The types the report is about: up to two leaders, or the strongest one in a balanced profile.
  const profiled = leaders.length > 0 ? leaders.slice(0, 2) : top ? [top] : [];
  const summary = summaryLines(psy, emo, t);
  const { ui, method, fit } = t.deep;
  const fits = fitRows(psy, t);
  const podium = fits.slice(0, 3);

  return (
    <article className="space-y-10">
      {backLink && <Link href={backLink.href} className="no-print text-sm text-muted hover:text-ink">← {backLink.label}</Link>}

      {top && (
        <section className="cover break-inside-avoid px-7 py-10 sm:px-12 sm:py-14 print:px-8 print:py-8">
          {/* The capsules of AVOCO's printed cover. */}
          <span className="cover-capsule drift" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
          <span className="cover-capsule drift hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-3s" }} aria-hidden />
          <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />
          <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 44, height: 150, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-7s" }} aria-hidden />

          <p className="cover-eyebrow relative"><span className="font-display text-xl font-semibold tracking-[0.2em]">{t.brand}</span><span className="mx-3 opacity-50">·</span>{r.title} · {recordedOn}</p>

          <div className="relative mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] print:mt-6 print:grid-cols-[1fr_1.2fr] print:gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--cover-muted)" }}>{leaders.length === 0 ? r.balancedTitle : leaders.length > 1 ? r.leadingTypes : r.leadingType}</p>
              <div className="mt-3 space-y-6">
                {profiled.map((type) => (
                  <div key={type.key}>
                    <h1 className={`gold-text sheen pb-2 font-display font-semibold leading-[0.95] ${profiled.length > 1 ? "text-5xl sm:text-6xl print:text-4xl" : "text-6xl sm:text-8xl print:text-6xl"}`}>{type.name}</h1>
                    <p className="mt-3 flex items-baseline gap-3">
                      <span className="text-4xl font-semibold tabular-nums"><CountUp value={type.value} /></span>
                      <span className="text-sm" style={{ color: "var(--cover-muted)" }}>/ 100</span>
                      {type.tag && <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{type.tag}</span>}
                    </p>
                    {profiled.length > 1 && type.text && <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--cover-muted)" }}>{type.text}</p>}
                  </div>
                ))}
              </div>
              {profiled.length === 1 && (
                <p className="mt-6 max-w-md leading-relaxed sm:text-lg print:text-sm" style={{ color: "var(--cover-muted)" }}>
                  {leaders.length === 0 && `${r.balancedText.replace("{type}", top.name)} `}{top.text}
                </p>
              )}
            </div>
            <div>
              <p className="cover-eyebrow text-center">{r.signature}</p>
              <Radar rows={psy} help={r.signatureHelp} />
            </div>
          </div>
        </section>
      )}

      {lead}

      {summary.length > 0 && (
        <Reveal as="section" className="soft-panel break-inside-avoid p-7 sm:p-10">
          <p className="eyebrow !text-accent-text">{ui.summaryTitle}</p>
          <div className="mt-4 space-y-2 leading-relaxed text-ink-2 sm:text-lg">{summary.map((line) => <p key={line}>{line}</p>)}</div>
        </Reveal>
      )}

      {profiled.some((type) => type.details.length > 0) && (
        <Reveal as="section">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">{r.profileTitle}</h2>
          <p className="mb-8 mt-3 max-w-2xl leading-relaxed text-ink-2">{profiled.length > 1 ? r.profileLeadTwo : r.profileLead}</p>
          <Profile rows={profiled.filter((type) => type.details.length > 0)} opening={t.types.ui.overview} />
        </Reveal>
      )}

      {psy.length > 0 && (
        <Reveal as="section" className="card card-flow p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">{r.psyTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.psyLead}</p>
          <div className="mt-8"><Bars rows={psy} markers expandLabel={ui.expand} profiled={profiled.map((type) => type.key)} /></div>
          <p className="mt-6 text-xs text-muted">{r.zoneHelp}</p>
        </Reveal>
      )}

      {fits.length > 0 && (
        <Reveal as="section" className="card card-flow p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">{fit.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{fit.lead}</p>

          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {podium.map((f, i) => (
              <li key={f.key} className="soft-panel break-inside-avoid p-6">
                <div className="flex items-center justify-between gap-3">
                  <Ring score={f.score} label={`${f.name}: ${f.score} / 100`} />
                  <span className="font-display text-5xl font-medium text-accent-text" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-4 text-lg font-semibold leading-snug">{f.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
                <p className="mt-2 text-xs text-muted">{f.because}</p>
              </li>
            ))}
          </ol>

          <ol className="mt-8 space-y-5" start={podium.length + 1}>
            {fits.slice(podium.length).map((f, i, rest) => (
              <li key={f.key} className="break-inside-avoid-page">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{f.name}</span>
                  <span className="flex items-baseline gap-3">
                    {i >= rest.length - 3 && <span className="text-xs text-muted">{fit.effort}</span>}
                    <span className="w-10 text-right font-semibold tabular-nums">{f.score}</span>
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-r-full bg-track" role="img" aria-label={`${f.name}: ${f.score} / 100`}>
                  <div className="bar-fill h-full rounded-r-full" style={{ width: `${f.score}%`, background: i >= rest.length - 3 ? "var(--bar-background)" : "var(--bar-active)", animationDelay: `${i * 50}ms` }} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
                <p className="mt-1 text-xs text-muted">{f.because}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-line pt-6 text-xs leading-relaxed text-muted">{fit.note}</p>
        </Reveal>
      )}

      {emo.length > 0 && (
        <Reveal as="section" className="card card-flow p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">{r.emoTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.emoLead}</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Highlight title={r.strongest} names={emo.slice(0, 3).map((s) => s.name)} gold />
            <Highlight title={r.weakest} names={emo.slice(-3).reverse().map((s) => s.name)} />
          </div>
          <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
            <Bars rows={emo.slice(0, Math.ceil(emo.length / 2))} expandLabel={ui.expand} />
            <Bars rows={emo.slice(Math.ceil(emo.length / 2))} expandLabel={ui.expand} />
          </div>
        </Reveal>
      )}

      <Reveal as="section" className="card card-flow p-8 sm:p-12">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">{method.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{method.lead}</p>
        <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {method.sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold">{section.title}</h3>
              {"text" in section && section.text && <p className="mt-2 text-sm leading-relaxed text-ink-2">{section.text}</p>}
              {"items" in section && section.items && (
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">
                  {section.items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden /><span>{item}</span></li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Reveal>

      <p className="max-w-3xl text-xs leading-relaxed text-muted">{r.disclaimer}</p>

      <div className="no-print flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={() => window.print()}>{r.print}</button>
        {del && <button type="button" className="btn btn-quiet btn-danger" onClick={remove} disabled={deleting}>{deleting ? r.deleting : deleteLabel ?? r.delete}</button>}
      </div>
    </article>
  );
}

const RING_R = 34;
const RING_LENGTH = 2 * Math.PI * RING_R;

/** A score out of 100 as a ring, with the number inside. */
function Ring({ score, label }: { score: number; label: string }) {
  return (
    <span className="relative grid h-20 w-20 place-items-center" role="img" aria-label={label}>
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={RING_R} fill="none" stroke="color-mix(in oklab, var(--bar-background) 35%, transparent)" strokeWidth="6" />
        <circle className="score-ring" cx="40" cy="40" r={RING_R} fill="none" stroke="var(--bar-leading)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={RING_LENGTH} strokeDashoffset={RING_LENGTH * (1 - Math.max(0, Math.min(100, score)) / 100)} style={{ "--ring-length": RING_LENGTH } as React.CSSProperties} />
      </svg>
      <span className="text-xl font-semibold tabular-nums">{score}</span>
    </span>
  );
}

function Highlight({ title, names, gold = false }: { title: string; names: string[]; gold?: boolean }) {
  return (
    <div className={`break-inside-avoid p-6 ${gold ? "gold-panel" : "soft-panel"}`}>
      <p className={`text-xs font-extrabold uppercase tracking-[0.12em] ${gold ? "" : "text-accent-text"}`}>{title}</p>
      <p className="mt-2 font-display text-2xl leading-snug">{names.join(" · ")}</p>
    </div>
  );
}
