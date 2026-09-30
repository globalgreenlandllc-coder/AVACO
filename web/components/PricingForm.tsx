"use client";

import { useActionState } from "react";
import type { PricingState } from "@/app/admin/actions";
import { priceText, type PricingCurrent } from "@/lib/pricing-form";

const input = "rounded-lg border border-line bg-bg px-3 py-2 text-sm";
const bad = "!border-danger";

/**
 * The admin portal's pricing form. Prices are typed as text with the decimal keypad on phones, so "12,50" means 12.50
 * instead of becoming 1250; the server reads every box before saving anything (lib/pricing-form.ts). After an answer
 * the boxes are drawn again: from what is now saved, or, when something was wrong, from what was typed.
 */
export function PricingForm({ save, current, names, stripeConnected }: { save: (prev: PricingState, form: FormData) => Promise<PricingState>; current: PricingCurrent; names: Record<string, string>; stripeConnected: boolean }) {
  const [state, action, pending] = useActionState<PricingState, FormData>(save, { ok: null, message: "", errors: {}, fields: {}, attempt: 0 });
  const cur = current.currency.toUpperCase();
  const typed = state.ok === false ? state.fields : {};
  const d = (name: string, saved: string) => typed[name] ?? saved;
  const err = (name: string) => state.errors[name];
  const single = current.packs.find((p) => p.audience === "user" && p.credits === 1);
  const priceBox = (name: string, saved: number, wide = true) => (
    <input name={name} type="text" inputMode="decimal" autoComplete="off" defaultValue={d(name, priceText(saved))} aria-invalid={Boolean(err(name))} className={`${input} ${wide ? "mt-1.5 w-full" : "w-28"} ${err(name) ? bad : ""}`} />
  );
  const countBox = (name: string, saved: number, wide = true) => (
    <input name={name} type="text" inputMode="numeric" autoComplete="off" defaultValue={d(name, String(saved))} aria-invalid={Boolean(err(name))} className={`${input} ${wide ? "mt-1.5 w-full" : "w-24"} ${err(name) ? bad : ""}`} />
  );
  const note = (name: string) => err(name) && <span role="alert" className="mt-1 block text-xs font-medium text-danger">{err(name)}</span>;

  return (
    <form action={action} className="card space-y-6 p-7 sm:p-9">
      <h2 className="font-display text-3xl font-medium">Pricing</h2>
      {/* Drawn again after every answer: a key change remounts the boxes with the newest saved (or typed) values. */}
      <div key={state.attempt} className="space-y-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="enabled" defaultChecked={state.ok === false ? typed.enabled === "on" : current.enabled} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
          <span><span className="font-medium">Charge for reports</span><span className="block text-sm leading-relaxed text-ink-2">Off: every report is free. On: a person&apos;s new recording is a free preview and one credit opens the full report; every recording made for a company uses one of its credits. Reports made before you switch this on stay open.</span></span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="firstFree" defaultChecked={state.ok === false ? typed.firstFree === "on" : current.firstFree} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
          <span><span className="font-medium">First report free</span><span className="block text-sm leading-relaxed text-ink-2">Every new account&apos;s first Personality Analysis opens in full for free, once, with no card. Career Fit, Best-Fit Industry and Relationship stay paid. The landing page and the recorder say so while this is on (and charging is on).</span></span>
        </label>
        {!stripeConnected && <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">Stripe is not connected: connect it in the Card payments section above. If you switch charging on now, people can only get credits from promo codes and from grants you make here.</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 font-semibold">Pack</th><th className="px-3 font-semibold">For</th><th className="px-3 font-semibold">Credits</th><th className="px-3 font-semibold">Price ({cur})</th><th className="px-3 text-right font-semibold">Per report</th></tr></thead>
            <tbody className="divide-y divide-line">
              {current.packs.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-medium">{names[p.id] ?? p.id}</td>
                  <td className="px-3 text-ink-2">{p.audience === "user" ? "People" : "Companies"}</td>
                  <td className="px-3" aria-label={`${p.id} credits`}>{countBox(`credits:${p.id}`, p.credits, false)}</td>
                  <td className="px-3" aria-label={`${p.id} price`}>{priceBox(`price:${p.id}`, p.amountCents, false)}</td>
                  <td className="px-3 text-right tabular-nums text-ink-2">{(p.amountCents / 100 / p.credits).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {current.packs.map((p) => <span key={p.id}>{note(`credits:${p.id}`)}{note(`price:${p.id}`)}</span>)}
        </div>

        {/* The paid reports side by side: the type report (the Single report pack), then its add-ons. */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted">The paid reports</h3>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm"><span className="text-ink-2">Complete Personality Analysis, per report ({cur})</span>{priceBox("typePrice", single?.amountCents ?? 900)}{note("typePrice")}<span className="mt-1 block text-xs leading-relaxed text-muted">The full report on a person&apos;s own voice: their type, emotional state and best fields. Same price as the Single report pack above.</span></label>
            <label className="text-sm"><span className="text-ink-2">Career Fit, per industry ({cur})</span>{priceBox("industryPrice", current.industryCents)}{note("industryPrice")}<span className="mt-1 block text-xs leading-relaxed text-muted">Paid straight from the card on a report. A report credit can open a chapter too.</span></label>
            <label className="text-sm"><span className="text-ink-2">Find My Best-Fit Industry, per report ({cur})</span>{priceBox("bestPrice", current.bestCents)}{note("bestPrice")}<span className="mt-1 block text-xs leading-relaxed text-muted">Assesses the profile against every industry: the best match with its strongest role and full chapter, and the top five from different fields. Paid straight from the card; also sold inside gifts.</span></label>
            <label className="text-sm"><span className="text-ink-2">Relationship &amp; Compatibility, per pair ({cur})</span>{priceBox("matchPrice", current.matchCents)}{note("matchPrice")}<span className="mt-1 block text-xs leading-relaxed text-muted">Paid straight from the card on a report; the partner&apos;s own report is included.</span></label>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <label className="text-sm"><span className="text-ink-2">Currency (3 letters)</span><input name="currency" autoComplete="off" defaultValue={d("currency", current.currency)} maxLength={3} className={`${input} mt-1.5 w-full uppercase ${err("currency") ? bad : ""}`} />{note("currency")}</label>
          <label className="text-sm"><span className="text-ink-2">Free previews per person, per 30 days</span>{countBox("freePreviews", current.freePreviews)}{note("freePreviews")}</label>
          <label className="text-sm"><span className="text-ink-2">Trial credits for a new company</span>{countBox("trialCredits", current.trialCredits)}{note("trialCredits")}</label>
          <label className="text-sm"><span className="text-ink-2">Find My Best-Fit Industry, in credits</span>{countBox("bestCredits", current.bestCredits)}{note("bestCredits")}<span className="mt-1 block text-xs leading-relaxed text-muted">What it costs someone who pays with report credits, and what a gift carries for it.</span></label>
          <label className="text-sm"><span className="text-ink-2">Relationship &amp; Compatibility, in credits</span>{countBox("matchCredits", current.matchCredits)}{note("matchCredits")}<span className="mt-1 block text-xs leading-relaxed text-muted">What it costs someone who pays with report credits instead of the card.</span></label>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">Each free preview costs you one AVOCO analysis, so the preview limit is your protection against people who record and never pay.</p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : "Save pricing"}</button>
        {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.ok ? "✓ " : ""}{state.message}</p>}
      </div>
    </form>
  );
}
