import { listAdmins, listPromoCodes, requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/billing";
import { stripeReady } from "@/lib/stripe";
import { addAdminAction, createPromoAction, removeAdminAction, saveSettingsAction, togglePromoAction } from "../actions";

export const dynamic = "force-dynamic";

const input = "rounded-lg border border-line bg-bg px-3 py-2 text-sm";
const NAMES: Record<string, string> = { one: "Single report", three: "Three reports", ten: "Ten reports", team25: "Team 25", team100: "Team 100", team500: "Team 500" };

export default async function AdminSettings() {
  const [me, cfg, promos, adminList] = await Promise.all([requireAdmin(), getSettings(), listPromoCodes(), listAdmins()]);
  const envAdmins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

  return (
    <div className="space-y-10">
      <form action={saveSettingsAction} className="card space-y-6 p-7 sm:p-9">
        <h2 className="font-display text-3xl font-medium">Pricing</h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="enabled" defaultChecked={cfg.enabled} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
          <span><span className="font-medium">Charge for reports</span><span className="block text-sm leading-relaxed text-ink-2">Off: every report is free. On: a person's new recording is a free preview and one credit opens the full report; every recording made for a company uses one of its credits. Reports made before you switch this on stay open.</span></span>
        </label>
        {!stripeReady() && <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">Stripe is not connected (STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are missing). If you switch charging on now, people can only get credits from promo codes and from grants you make here.</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 font-semibold">Pack</th><th className="px-3 font-semibold">For</th><th className="px-3 font-semibold">Credits</th><th className="px-3 font-semibold">Price ({cfg.currency.toUpperCase()})</th><th className="px-3 text-right font-semibold">Per report</th></tr></thead>
            <tbody className="divide-y divide-line">
              {cfg.packs.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-medium">{NAMES[p.id] ?? p.id}</td>
                  <td className="px-3 text-ink-2">{p.audience === "user" ? "People" : "Companies"}</td>
                  <td className="px-3"><input name={`credits:${p.id}`} type="number" min="1" step="1" defaultValue={p.credits} className={`${input} w-24`} aria-label={`${p.id} credits`} /></td>
                  <td className="px-3"><input name={`price:${p.id}`} type="number" min="0.5" step="0.01" defaultValue={(p.amountCents / 100).toFixed(2)} className={`${input} w-28`} aria-label={`${p.id} price`} /></td>
                  <td className="px-3 text-right tabular-nums text-ink-2">{(p.amountCents / 100 / p.credits).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="text-sm"><span className="text-ink-2">Currency (3 letters)</span><input name="currency" defaultValue={cfg.currency} maxLength={3} className={`${input} mt-1.5 w-full uppercase`} /></label>
          <label className="text-sm"><span className="text-ink-2">Free previews per person, per 30 days</span><input name="freePreviews" type="number" min="0" max="100" defaultValue={cfg.freePreviewsPer30Days} className={`${input} mt-1.5 w-full`} /></label>
          <label className="text-sm"><span className="text-ink-2">Trial credits for a new company</span><input name="trialCredits" type="number" min="0" max="1000" defaultValue={cfg.workspaceTrialCredits} className={`${input} mt-1.5 w-full`} /></label>
        </div>
        <p className="text-xs leading-relaxed text-muted">Each free preview costs you one AVOCO analysis, so the preview limit is your protection against people who record and never pay.</p>
        <button type="submit" className="btn">Save pricing</button>
      </form>

      <section className="card space-y-6 p-7 sm:p-9">
        <h2 className="font-display text-3xl font-medium">Promo codes</h2>
        <form action={createPromoAction} className="flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="text-ink-2">Code</span><input name="code" required maxLength={40} placeholder="LAUNCH" className={`${input} mt-1.5 block w-40 uppercase`} /></label>
          <label className="text-sm"><span className="text-ink-2">Credits</span><input name="credits" type="number" min="1" required defaultValue={1} className={`${input} mt-1.5 block w-24`} /></label>
          <label className="text-sm"><span className="text-ink-2">Max uses (blank = no limit)</span><input name="maxUses" type="number" min="1" className={`${input} mt-1.5 block w-40`} /></label>
          <label className="text-sm"><span className="text-ink-2">Valid for days (blank = forever)</span><input name="days" type="number" min="1" className={`${input} mt-1.5 block w-44`} /></label>
          <label className="text-sm"><span className="text-ink-2">Note</span><input name="note" maxLength={200} placeholder="Conference, partner…" className={`${input} mt-1.5 block w-48`} /></label>
          <button type="submit" className="btn btn-quiet">Create code</button>
        </form>
        {promos.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {promos.map((p) => (
              <li key={p.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><span className="font-semibold">{p.code}</span> · {p.credits} credit{p.credits === 1 ? "" : "s"} · used {p.used}{p.maxUses ? ` of ${p.maxUses}` : ""}{p.expiresAt ? ` · until ${p.expiresAt.toISOString().slice(0, 10)}` : ""}{p.note ? <span className="text-muted"> · {p.note}</span> : null}</span>
                <form action={togglePromoAction}><input type="hidden" name="code" value={p.code} /><input type="hidden" name="active" value={p.active ? "0" : "1"} />
                  <button type="submit" className="rounded-md border border-line px-3 py-1 text-xs hover:border-ink-2">{p.active ? "Switch off" : "Switch on"}</button></form>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">One use per person or company. Each person can use a given code once.</p>
      </section>

      <section className="card space-y-5 p-7 sm:p-9">
        <h2 className="font-display text-3xl font-medium">Admins</h2>
        <ul className="divide-y divide-line text-sm">
          {envAdmins.map((e) => <li key={e} className="flex items-center justify-between py-2.5"><span>{e}{e === me.email ? " (you)" : ""}</span><span className="text-xs text-muted">set in the server environment</span></li>)}
          {adminList.filter((a) => !envAdmins.includes(a.email)).map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3 py-2.5"><span>{a.email}{a.email === me.email ? " (you)" : ""}</span>
              <form action={removeAdminAction}><input type="hidden" name="email" value={a.email} /><button type="submit" className="rounded-md border border-line px-3 py-1 text-xs hover:border-ink-2" disabled={a.email === me.email}>Remove</button></form></li>
          ))}
        </ul>
        <form action={addAdminAction} className="flex flex-wrap gap-3"><input name="email" type="email" required placeholder="colleague@company.com" className={`${input} w-72`} aria-label="Email" /><button type="submit" className="btn btn-quiet">Add admin</button></form>
        <p className="text-xs text-muted">An admin signs in to AVOCO with that email (it must be verified) and opens /admin.</p>
      </section>
    </div>
  );
}
