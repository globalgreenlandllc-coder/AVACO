"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { emostateRows, failureKind, leadingTypes, psytypeRows } from "@/lib/report";
import { Bars } from "./Bars";

export interface Report {
  id: string;
  status: "processing" | "completed" | "failed";
  created_at: string;
  psytype: Array<{ key: string; label: string; value: number; zone: "leading" | "active" | "background" }> | null;
  emostate: Array<{ key: string; label: string; value: number }> | null;
  error: string | null;
}

const POLL_MS = 4000;

export function ReportView({ initial, recordedOn, t }: { initial: Report; recordedOn: string; t: Dict }) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [deleting, setDeleting] = useState(false);
  const r = t.report;

  // While AVOCO works, ask again every few seconds. The result arrives on the gateway's webhook.
  useEffect(() => {
    if (report.status !== "processing") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/analyses/${report.id}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setReport(await res.json());
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [report.id, report.status]);

  async function remove() {
    if (!window.confirm(r.deleteConfirm)) return;
    setDeleting(true);
    const res = await fetch(`/api/analyses/${report.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push("/reports");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  const heading = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/reports" className="no-print text-sm text-muted hover:text-ink">← {r.back}</Link>
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
            <button type="button" className="btn btn-quiet" onClick={remove} disabled={deleting}>{deleting ? r.deleting : r.delete}</button>
          </div>
        </div>
      </div>
    );
  }

  const psy = psytypeRows(report.psytype ?? [], t);
  const emo = emostateRows(report.emostate ?? [], t);
  const leaders = leadingTypes(psy);
  const top = psy[0];

  return (
    <article className="space-y-8">
      {heading}

      {top && (
        <section className="card p-8 sm:p-12">
          {leaders.length > 0 ? (
            <>
              <p className="eyebrow">{leaders.length > 1 ? r.leadingTypes : r.leadingType}</p>
              {/* One leader: name on the left, meaning on the right. Two: side by side. */}
              <div className={leaders.length > 1 ? "mt-6 grid gap-10 sm:grid-cols-2" : "mt-6"}>
                {leaders.slice(0, 2).map((type) => (
                  <div key={type.key} className={leaders.length > 1 ? "" : "grid items-end gap-6 sm:grid-cols-2 sm:gap-12"}>
                    <div>
                      <h1 className="font-display text-5xl font-medium leading-none sm:text-7xl">{type.name}</h1>
                      <p className="mt-4 text-sm text-muted"><span className="text-2xl font-semibold tabular-nums text-ink">{type.value}</span> / 100</p>
                    </div>
                    {type.text && <p className={`leading-relaxed text-ink-2 ${leaders.length > 1 ? "mt-4" : "sm:text-lg"}`}>{type.text}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">{r.balancedTitle}</p>
              <h1 className="mt-6 font-display text-5xl font-medium leading-none sm:text-6xl">{top.name}</h1>
              <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{r.balancedText.replace("{type}", top.name)} {top.text}</p>
            </>
          )}
        </section>
      )}

      {psy.length > 0 && (
        <section className="card p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium">{r.psyTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.psyLead}</p>
          <div className="mt-8"><Bars rows={psy} zoneLabels={r.zones} markers /></div>
          <p className="mt-6 text-xs text-muted">{r.zoneHelp}</p>
        </section>
      )}

      {emo.length > 0 && (
        <section className="card p-8 sm:p-12">
          <h2 className="font-display text-3xl font-medium">{r.emoTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{r.emoLead}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <Highlight title={r.strongest} names={emo.slice(0, 3).map((s) => s.name)} />
            <Highlight title={r.weakest} names={emo.slice(-3).reverse().map((s) => s.name)} />
          </div>
          <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
            <Bars rows={emo.slice(0, Math.ceil(emo.length / 2))} />
            <Bars rows={emo.slice(Math.ceil(emo.length / 2))} />
          </div>
        </section>
      )}

      <p className="max-w-3xl text-xs leading-relaxed text-muted">{r.disclaimer}</p>

      <div className="no-print flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={() => window.print()}>{r.print}</button>
        <button type="button" className="btn btn-quiet btn-danger" onClick={remove} disabled={deleting}>{deleting ? r.deleting : r.delete}</button>
      </div>
    </article>
  );
}

function Highlight({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="border-l-2 border-accent pl-5">
      <p className="eyebrow">{title}</p>
      <p className="mt-2 font-display text-2xl leading-snug">{names.join(" · ")}</p>
    </div>
  );
}
