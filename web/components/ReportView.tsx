"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Analysing } from "./Analysing";
import type { Dict } from "@/lib/i18n";
import { buildReportFile, saveFile } from "@/lib/export";
import { emostateRows, failureKind, fitRows, leadingTypes, psytypeRows, summaryLines, type Teaser } from "@/lib/report";
import { Bars } from "./Bars";
import { Industry, type IndustryProps } from "./Industry";
import { LockedPreview, type PreviewTakes } from "./LockedPreview";
import { MatchAddon, type MatchAddonProps } from "./MatchAddon";
import { CoupleReport } from "./MatchView";
import type { MatchReport } from "@/lib/match-report";
import { nameSlug } from "@/lib/person";
import { PersonName } from "./PersonName";
import { CountUp, Reveal } from "./Motion";
import { Profile } from "./Profile";
import { Radar } from "./Radar";

export interface Report {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  psytype: Array<{ key: string; label: string; value: number; zone: "leading" | "active" | "background" }> | null;
  emostate: Array<{ key: string; label: string; value: number }> | null;
  error: string | null;
  /** Present on a free preview, which carries no result: psytype and emostate are null, the teaser is the outline. */
  locked?: true;
  teaser?: Teaser;
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
  /** The person's profile across several recordings (lib/consensus.ts), when they have them. Names and dates pre-localized. */
  takes?: { n: number; band: "high" | "medium" | "low"; pct: number; leader: string; thisRecording: { name: string; value: number } | null; recordings: Array<{ id: string; date: string; name: string; value: number; current: boolean }> };
  /** The "narrow it to your industry" chapter; absent where it isn't offered. */
  industry?: Omit<IndustryProps, "t" | "analysisId" | "finder">;
  /** The relationship-match add-on; absent where it isn't offered. */
  match?: Omit<MatchAddonProps, "t" | "analysisId">;
  /** A free preview: the locked outline of the report (LockedPreview), then this, the paywall. */
  locked?: React.ReactNode;
  /** On a free preview, what may be said about the recordings behind the profile: how many, how settled, when. */
  previewTakes?: PreviewTakes;
  /** The finished couple's reports ordered from this report: copied hidden into the page, for print and the file. */
  couples?: Array<{ id: string; names: { a: string; b: string }; report: MatchReport }>;
  /** A mailbox is connected: the file can be emailed to the person's sign-in address. */
  canEmail?: boolean;
  /** What this report already holds, listed with the add-ons at its foot: opened industry chapters and pair reports. */
  opened?: { industries: Array<{ key: string; name: string; href: string }>; couples: Array<{ id: string; href: string; glyph: string; label: string }> };
  /** Whose voice this is (lib/people.ts), with the names already used on the account; passed where the report can be renamed. */
  person?: { name: string | null; known: string[] };
}

export function ReportView({ initial, recordedOn, t, pollUrl, deleteUrl, afterDeleteHref = "/reports", deleteLabel, deleteConfirm, back, lead, hideEmotions = false, locked, industry, takes, match, previewTakes, person, couples = [], canEmail = false, opened }: ReportViewProps) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [allTakes, setAllTakes] = useState(false);
  const article = useRef<HTMLElement>(null);
  const r = t.report;
  const poll = pollUrl ?? `/api/analyses/${initial.id}`;
  const del = deleteUrl === undefined ? `/api/analyses/${initial.id}` : deleteUrl;
  const backLink = back === undefined ? { href: "/reports", label: r.back } : back;

  // While AVOCO works, ask again every few seconds. The result arrives on the gateway's webhook.
  useEffect(() => {
    if (report.status !== "processing" && report.status !== "queued") return;
    const timer = setInterval(async () => {
      const res = await fetch(poll, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const next: Report = await res.json();
      setReport(next);
      // Finished: let the server render the page again, so a free preview gets its paywall.
      if (next.status !== "processing" && next.status !== "queued") router.refresh();
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

  /**
   * The report as files. Each piece on its own (the type report, one industry chapter, the best industry, one couple's
   * report) or everything paid for in one file. The add-on pieces sit hidden at the end of the page (data-export-show),
   * put there for print and for this; the file builder unhides them.
   */
  type Piece = { kind: "type" } | { kind: "chapter"; key: string } | { kind: "best" } | { kind: "couple"; id: string } | { kind: "all" };
  const [saving, setSaving] = useState<string | null>(null);
  const [mailing, setMailing] = useState<{ state: "idle" } | { state: "sending" } | { state: "sent"; to: string } | { state: "failed"; reason: "no_email" | "other" }>({ state: "idle" });
  const day = report.created_at.slice(0, 10);
  // Someone else's report carries their name in the file name and title, so a folder of reports stays readable.
  const who = person?.name ? `-${nameSlug(person.name)}` : "", whoTitle = person?.name ? ` · ${person.name}` : "";
  const pieceId = (piece: Piece) => piece.kind === "chapter" ? `chapter:${piece.key}` : piece.kind === "couple" ? `couple:${piece.id}` : piece.kind;

  async function buildFile(piece: Piece): Promise<{ blob: Blob; name: string } | null> {
    const root = article.current;
    if (!root) return null;
    const stamp = `${whoTitle} · ${recordedOn}`;
    if (piece.kind === "type") {
      return { blob: await buildReportFile(root, `${t.brand} · ${t.report.title}${stamp}`, { exclude: ["[data-export-show]", "[data-industry]", "[data-match]"] }), name: `avoco-type-report${who}-${day}.html` };
    }
    if (piece.kind === "all") {
      return { blob: await buildReportFile(root, `${t.brand} · ${t.report.title}${stamp}`), name: `avoco-report-all${who}-${day}.html` };
    }
    if (piece.kind === "chapter") {
      const node = root.querySelector<HTMLElement>(`[data-industry-chapter-print="${piece.key}"]`);
      const name = industry?.industries.find((i) => i.key === piece.key)?.name ?? piece.key;
      return node ? { blob: await buildReportFile(node, `${t.brand} · ${name}${stamp}`, { heading: `${t.industry.title} · ${name}` }), name: `avoco-${piece.key}-chapter${who}-${day}.html` } : null;
    }
    if (piece.kind === "best") {
      const node = root.querySelector<HTMLElement>(`[data-industry-chapter-print="best"]`);
      return node ? { blob: await buildReportFile(node, `${t.brand} · ${r.downloadBest}${stamp}`, { heading: r.downloadBest }), name: `avoco-best-industry${who}-${day}.html` } : null;
    }
    const couple = couples.find((c) => c.id === piece.id);
    const node = root.querySelector<HTMLElement>(`[data-couple-print="${piece.id}"] > section`); // the section, not its hidden wrapper
    if (!couple || !node) return null;
    const names = t.match.matchTitle.replace("{a}", couple.names.a).replace("{b}", couple.names.b);
    return { blob: await buildReportFile(node, `${t.brand} · ${names}`), name: `avoco-match-${nameSlug(couple.names.a)}-${nameSlug(couple.names.b)}.html` };
  }

  async function download(piece: Piece) {
    setSaving(pieceId(piece));
    try {
      const file = await buildFile(piece);
      if (file) saveFile(file.blob, file.name);
    } finally {
      setSaving(null);
    }
  }

  /** Everything in one file, mailed to the sign-in address by the server (app/api/analyses/[id]/email). */
  async function emailAll() {
    setMailing({ state: "sending" });
    try {
      const file = await buildFile({ kind: "all" });
      if (!file) throw new Error("no file");
      const form = new FormData();
      form.append("file", new File([file.blob], file.name, { type: "text/html" }));
      form.append("pieces", JSON.stringify(pieces.filter((p) => p.ready).map((p) => p.label)));
      const res = await fetch(`/api/analyses/${report.id}/email`, { method: "POST", body: form }).catch(() => null);
      const body = await res?.json().catch(() => null);
      if (res?.ok && body?.to) setMailing({ state: "sent", to: body.to });
      else setMailing({ state: "failed", reason: body?.error === "no_email" ? "no_email" : "other" });
    } catch {
      setMailing({ state: "failed", reason: "other" });
    }
  }

  // Which add-on pieces are on the page (copied into the print slot by the add-on's card), so each can be a file.
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!slot) return;
    const update = () => setLoaded(new Set(Array.from(slot.querySelectorAll<HTMLElement>("[data-industry-chapter-print]")).map((n) => n.dataset.industryChapterPrint ?? "")));
    update();
    const observer = new MutationObserver(update);
    observer.observe(slot, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [slot]);

  // The list at the foot of the page: every report this person has here, ready to save or still on its way.
  const pieces: Array<{ piece: Piece; label: string; ready: boolean; waiting?: boolean }> = [
    { piece: { kind: "type" }, label: r.downloadType, ready: true },
    ...(industry?.unlocked ?? []).map((key) => ({ piece: { kind: "chapter", key } as Piece, label: r.downloadIndustry.replace("{name}", industry?.industries.find((i) => i.key === key)?.name ?? key), ready: loaded.has(key) })),
    ...(loaded.has("best") ? [{ piece: { kind: "best" } as Piece, label: r.downloadBest, ready: true }] : []),
    ...couples.map((c) => ({ piece: { kind: "couple", id: c.id } as Piece, label: r.downloadCouple.replace("{names}", t.match.matchTitle.replace("{a}", c.names.a).replace("{b}", c.names.b)), ready: true })),
    ...(match?.existing ?? []).filter((m) => m.stage !== "ready").map((m) => ({ piece: { kind: "couple", id: m.id } as Piece, label: r.downloadCoupleWaiting.replace("{name}", m.partnerName), ready: false, waiting: true })),
  ];
  const readyPieces = pieces.filter((p) => p.ready);
  const openedCount = (opened?.industries.length ?? 0) + (opened?.couples.length ?? 0);
  const everythingLabel = readyPieces.length > 1 ? r.downloadEverything.replace("{n}", String(readyPieces.length)) : r.download;

  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {backLink && <Link href={backLink.href} className="no-print text-sm text-muted hover:text-ink">← {backLink.label}</Link>}
        <p className="eyebrow mt-6">{r.title}</p>
        <p className="mt-2 text-sm text-ink-2">{r.recordedOn}: {recordedOn}</p>
      </div>
    </div>
  );

  if (report.status === "processing" || report.status === "queued") {
    return (
      <div>
        {heading}
        <Analysing t={r.live} startedAt={new Date(report.created_at).getTime()} thoughts={thoughtsFor(t)} queued={report.status === "queued"} />
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

  // A preview stays a preview even in the moment before the server hands over the paywall. It holds no result to show.
  if (Boolean(locked) || report.locked === true) {
    return (
      <article className="space-y-10">
        {backLink && <Link href={backLink.href} className="no-print text-sm text-muted hover:text-ink">← {backLink.label}</Link>}
        <LockedPreview t={t} recordedOn={recordedOn} teaser={report.teaser} takes={previewTakes} hideEmotions={hideEmotions} />
        {lead}
        <div id="unlock" className="scroll-mt-24">{locked}</div>
        <p className="max-w-3xl text-xs leading-relaxed text-muted">{r.disclaimer}</p>
        {del && <div className="no-print"><button type="button" className="btn btn-quiet btn-danger" onClick={remove} disabled={deleting}>{deleting ? r.deleting : deleteLabel ?? r.delete}</button></div>}
      </article>
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
  const fits = fitRows(psy, t, emo);
  const podium = fits.slice(0, 3);

  return (
    <article ref={article} className="space-y-10">
      {backLink && <Link href={backLink.href} data-no-export className="no-print text-sm text-muted hover:text-ink">← {backLink.label}</Link>}

      {top && (
        <section className="cover break-inside-avoid px-7 py-10 sm:px-12 sm:py-14 print:px-8 print:py-8">
          {/* The capsules of AVOCO's printed cover. */}
          <span className="cover-capsule drift" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
          <span className="cover-capsule drift hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-3s" }} aria-hidden />
          <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />
          <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 44, height: 150, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-7s" }} aria-hidden />

          <p className="cover-eyebrow relative"><span className="font-display text-xl font-semibold tracking-[0.2em]">{t.brand}</span><span className="mx-3 opacity-50">·</span>{r.title} · {recordedOn}</p>
          {person && <PersonName analysisId={report.id} name={person.name} known={person.known} t={t.people} />}

          <div className="relative mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] print:mt-6 print:grid-cols-[1fr_1.2fr] print:gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--cover-muted)" }}>{takes ? t.consistency.coverLabel.replace("{n}", String(takes.n)) : leaders.length === 0 ? r.balancedTitle : leaders.length > 1 ? r.leadingTypes : r.leadingType}</p>
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
          {/* The add-ons wait below the report; from the cover, one link takes the reader there. */}
          {(industry || match) && psy.length === 8 && (
            <p className="no-print relative mt-8" data-no-export>
              <a href="#addons" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[color-mix(in_oklab,var(--cover-gold)_12%,transparent)]" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 50%, transparent)", color: "var(--cover-gold)" }}>{openedCount > 0 ? r.addonsJumpOpened.replace("{n}", String(openedCount)) : r.addonsJump} ↓</a>
            </p>
          )}
        </section>
      )}

      {lead}

      {takes && (
        <Reveal as="section" className="card break-inside-avoid p-7 sm:p-10" id="consistency">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">{t.consistency.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${takes.band === "low" ? "border border-line text-ink-2" : "bg-accent text-accent-ink"}`}>{t.consistency.bands[takes.band]} · {takes.pct}%</span>
          </div>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{t.consistency.text.replace("{leader}", takes.leader).replace("{n}", String(takes.n)).replace("{pct}", String(takes.pct))}</p>
          {takes.thisRecording && takes.thisRecording.name !== takes.leader && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">{t.consistency.thisRecording.replace("{type}", takes.thisRecording.name).replace("{value}", String(takes.thisRecording.value))}</p>}
          <ul className="mt-5 flex flex-wrap gap-2">
            {(allTakes ? takes.recordings : takes.recordings.slice(0, 8)).map((x) => (
              <li key={x.id} className={`rounded-full px-3 py-1.5 text-xs ${x.current ? "bg-accent text-accent-ink font-semibold" : "border border-line text-ink-2"}`}>{x.date} · {x.name} {x.value}</li>
            ))}
            {takes.recordings.length > 8 && (
              <li><button type="button" data-no-export className="no-print rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent-text" onClick={() => setAllTakes((v) => !v)}>{allTakes ? r.showFewer : r.moreRecordings.replace("{n}", String(takes.recordings.length))}</button></li>
            )}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">{t.consistency.note}</p>
        </Reveal>
      )}

      {summary.length > 0 && (
        <Reveal as="section" className="soft-panel break-inside-avoid p-7 sm:p-10">
          <p className="eyebrow !text-accent-text">{ui.summaryTitle}</p>
          <div className="mt-4 space-y-2 leading-relaxed text-ink-2 sm:text-lg">{summary.map((line) => <p key={line}>{line}</p>)}</div>
        </Reveal>
      )}

      {profiled.some((type) => type.details.length > 0) && (
        <Reveal as="section" id="profile" className="scroll-mt-24">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">{r.profileTitle}</h2>
          <p className="mb-8 mt-3 max-w-2xl leading-relaxed text-ink-2">{profiled.length > 1 ? r.profileLeadTwo : r.profileLead}</p>
          <Profile rows={profiled.filter((type) => type.details.length > 0)} opening={t.types.ui.overview} />
        </Reveal>
      )}

      {psy.length > 0 && (
        <Reveal as="section" className="card card-flow p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">{r.psyTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.psyLead}</p>
          <div className="mt-8"><Bars rows={psy} markers expandLabel={ui.expand} profiledLabel={ui.profiled} profiled={profiled.map((type) => type.key)} /></div>
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
                <p className="eyebrow mt-4">{f.sector}</p>
                <p className="mt-1 text-lg font-semibold leading-snug">{f.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.text}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.roles}</p>
                <p className="mt-2 text-xs text-muted">{f.because}</p>
              </li>
            ))}
          </ol>

          <ol className="mt-8 grid gap-x-12 gap-y-5 sm:grid-cols-2" start={podium.length + 1}>
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
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.roles}</p>
                <p className="mt-1 text-xs text-muted">{f.sector} · {f.because}</p>
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

      {/* The add-ons come after the report, never above it: the report is what was paid for. Sold in their own covers. */}
      {(industry || match) && psy.length === 8 && (
        <section id="addons" data-no-export className="no-print scroll-mt-24 space-y-8">
          <div>
            <p className="eyebrow">{r.addonsEyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{r.addonsTitle}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{r.addonsLead}</p>
          </div>
          {openedCount > 0 && (
            <div className="card p-6 sm:p-8">
              <p className="eyebrow">{r.openedTitle}</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {[{ title: r.openedIndustries, items: (opened?.industries ?? []).map((i) => ({ id: i.key, href: i.href, label: i.name, glyph: "" })) }, { title: r.openedCouples, items: opened?.couples ?? [] }].filter((g) => g.items.length > 0).map((g) => (
                  <OpenedGroup key={g.title} title={g.title.replace("{n}", String(g.items.length))} items={g.items} showAll={r.showAll.replace("{n}", String(g.items.length))} />
                ))}
              </div>
            </div>
          )}
          {industry && <div id="industry" className="scroll-mt-24"><Industry key={industry.initialIndustry ?? ""} {...industry} analysisId={report.id} t={t.industry} finder={t.finder} printSlot={slot} /></div>}
          {match && <MatchAddon {...match} analysisId={report.id} t={t.match} />}
        </section>
      )}

      {/* The add-ons' content, for print and the downloaded file only: opened industry chapters (the add-on's card copies them here), then the couple's reports. */}
      {industry && psy.length === 8 && <div ref={setSlot} data-export-show className="hidden print:block" />}
      {couples.map((c) => (
        <div key={c.id} data-export-show data-couple-print={c.id} className="hidden print:block">
          <section className="theme-match space-y-10">
            <p className="addon-badge">{t.match.eyebrow}</p>
            <CoupleReport report={c.report} t={t.match} />
          </section>
        </div>
      ))}

      <p className="max-w-3xl text-xs leading-relaxed text-muted">{r.disclaimer}</p>

      <div data-no-export className="no-print">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={() => download({ kind: "all" })} disabled={saving !== null}>{saving === "all" ? r.downloading : everythingLabel}</button>
          <button type="button" className="btn btn-quiet" onClick={() => window.print()}>{r.print}</button>
          {del && <button type="button" className="btn btn-quiet btn-danger" onClick={remove} disabled={deleting}>{deleting ? r.deleting : deleteLabel ?? r.delete}</button>}
        </div>

        {/* Every report on this page as a file: one by one, all together, or by email. */}
        <section className="card mt-6 overflow-hidden" aria-labelledby="downloads-title">
          <div className="p-6 sm:p-8">
            <p id="downloads-title" className="eyebrow">{r.downloads}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.downloadsHelp}</p>
          </div>
          <ul className="border-t border-line">
            {pieces.map((p) => (
              <li key={pieceId(p.piece)} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 sm:px-8">
                <span className="flex items-center gap-3">
                  <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${p.ready ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{p.ready ? "✓" : "…"}</span>
                  <span className={p.ready ? "font-medium" : "text-ink-2"}>{p.label}</span>
                </span>
                {!p.waiting && (
                  <button type="button" className="pill pill-off" onClick={() => download(p.piece)} disabled={!p.ready || saving !== null}>
                    ↓ {saving === pieceId(p.piece) ? r.downloading : p.ready ? r.downloadOne : r.preparing}
                  </button>
                )}
              </li>
            ))}
            {industry && !industry.unlocked?.length && <li className="border-b border-line px-6 py-3 text-xs text-muted sm:px-8">{r.downloadIndustryNone}</li>}
          </ul>
          <div className="grid gap-px bg-line sm:grid-cols-2">
            <div className="bg-surface p-6 sm:p-8">
              <p className="font-semibold">{r.downloadAll}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.downloadAllHelp.replace("{list}", readyPieces.map((p) => p.label).join(" · "))}</p>
              <button type="button" className="btn mt-4" onClick={() => download({ kind: "all" })} disabled={saving !== null}>↓ {saving === "all" ? r.downloading : everythingLabel}</button>
            </div>
            {canEmail && (
              <div className="bg-surface p-6 sm:p-8">
                <p className="font-semibold">{r.emailTitle}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.emailText}</p>
                {mailing.state === "sent"
                  ? <p role="status" className="mt-4 rounded-xl border border-accent px-4 py-3 text-sm">✓ {r.emailSent.replace("{email}", mailing.to)}</p>
                  : <button type="button" className="btn btn-quiet mt-4" onClick={emailAll} disabled={mailing.state === "sending" || saving !== null}>✉ {mailing.state === "sending" ? r.emailSending : r.emailSend}</button>}
                {mailing.state === "failed" && <p role="alert" className="mt-3 text-sm text-danger">{mailing.reason === "no_email" ? r.emailNoAddress : r.emailFailed}</p>}
              </div>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}

/** Lines of thought for the analysing screen: the measurements, then each type and scale the engine scores. */
function thoughtsFor(t: Dict): string[] {
  const types = Object.values(t.psytypes as Record<string, { name: string }>).map((x) => t.report.live.thinkType.replace("{name}", x.name));
  const scales = Object.values(t.emostate as Record<string, { name: string }>).map((x) => t.report.live.thinkScale.replace("{name}", x.name));
  return [...t.report.live.thoughts, ...types, ...scales];
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

/** One group of what a report already holds: a few pills, the rest folded away until asked for. */
function OpenedGroup({ title, items, showAll }: { title: string; items: Array<{ id: string; href: string; label: string; glyph: string }>; showAll: string }) {
  const pill = (i: (typeof items)[number]) => <Link key={i.id} href={i.href} scroll className="pill pill-off !px-3 !py-1.5 !text-xs">{i.glyph ? `${i.glyph} ` : ""}{i.label} →</Link>;
  const shown = items.slice(0, 4), rest = items.slice(4);
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{shown.map(pill)}</div>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-accent-text">{showAll}</summary>
          <div className="mt-2 flex flex-wrap gap-2">{rest.map(pill)}</div>
        </details>
      )}
    </div>
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
