import { CopyField } from "@/components/CopyField";
import { EmailConnect, SampleReceipt } from "@/components/EmailConnect";
import { KeyConnect } from "@/components/KeyConnect";
import { MetaStatus } from "@/components/MetaStatus";
import { MetaTest } from "@/components/MetaTest";
import { capiToken, pixelId, pixelStatus } from "@/lib/meta-capi";
import { LanguageBuilder } from "@/components/LanguageBuilder";
import { LanguageBuilderAll } from "@/components/LanguageBuilderAll";
import { StripeConnect } from "@/components/StripeConnect";
import { listAdmins, listPromoCodes, requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/billing";
import { emailStatus } from "@/lib/email";
import { TRANSLATABLE } from "@/lib/i18n/languages";
import { LEGAL } from "@/lib/legal";
import { PACK_NAMES } from "@/lib/pack-names";
import { PricingForm } from "@/components/PricingForm";
import { industryPriceCents } from "@/lib/industry-billing";
import { matchCredits, matchPriceCents } from "@/lib/match-billing";
import { bestCredits, bestPriceCents } from "@/lib/best-billing";
import { baseUrl } from "@/lib/page";
import { stripeStatus } from "@/lib/stripe";
import { allProgress, deeplStatus, dictionaryCharacters } from "@/lib/translate";
import { addAdminAction, connectDeeplAction, createPromoAction, disconnectDeeplAction, disconnectEmailAction, disconnectStripeAction, removeAdminAction, removeLanguageAction, saveSettingsAction, togglePromoAction } from "../actions";

export const dynamic = "force-dynamic";

const input = "rounded-lg border border-line bg-bg px-3 py-2 text-sm";
const NAMES = PACK_NAMES;

export default async function AdminSettings() {
  const [me, cfg, promos, adminList, stripe, origin, deepl, progress, addonCents, matchCents, matchN, mail, bestCents, bestN] = await Promise.all([requireAdmin(), getSettings(), listPromoCodes(), listAdmins(), stripeStatus(), baseUrl(), deeplStatus(), allProgress(), industryPriceCents(), matchPriceCents(), matchCredits(), emailStatus(), bestPriceCents(), bestCredits()]);
  const envAdmins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const webhookUrl = `${origin}/api/stripe/webhook`;
  const languageSize = Math.round(dictionaryCharacters() / 1000) * 1000;
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="space-y-10">
      <section className="card space-y-5 p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-medium">Card payments (Stripe)</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${stripe.connected ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{stripe.connected ? `Connected · ${stripe.mode} mode` : "Not connected"}</span>
        </div>
        {stripe.connected ? (
          <>
            <p className="text-sm leading-relaxed text-ink-2">
              Account <span className="font-semibold text-ink">{stripe.account ?? "from the server environment"}</span> · key ends in <span className="font-mono">{stripe.keyHint}</span>
              {stripe.mode === "test" ? " · test mode: no real money moves; connect a live key to charge real cards" : " · live mode: real cards are charged"}
              {stripe.source === "portal" && stripe.savedAt ? ` · added by ${stripe.savedBy} on ${stripe.savedAt.slice(0, 10)}` : stripe.source === "environment" ? " · set in the server environment" : ""}.
            </p>
            <div className="text-sm">
              <p className="text-ink-2">{stripe.webhookUrl ? "Payment webhook registered in Stripe for you, event " : "Stripe must send payments to this webhook (Developers → Webhooks), event "}<span className="font-mono">checkout.session.completed</span>:</p>
              <div className="mt-2"><CopyField value={stripe.webhookUrl ?? webhookUrl} copy="Copy" copied="Copied" /></div>
            </div>
            {stripe.source === "portal" && (
              <form action={disconnectStripeAction}><button type="submit" className="btn btn-quiet btn-danger">Disconnect Stripe</button></form>
            )}
          </>
        ) : (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
              <li>In Stripe, open <span className="font-semibold text-ink">Developers → API keys</span> and copy the <span className="font-semibold text-ink">Secret key</span> (starts with <span className="font-mono">sk_live_</span>; a <span className="font-mono">sk_test_</span> key lets you try everything without real money). The publishable key (<span className="font-mono">pk_…</span>) is not needed.</li>
              <li>Paste it below and connect. The key is checked with Stripe, stored encrypted and never shown again, and the payment webhook is registered in your Stripe account for you at <span className="font-mono">{webhookUrl}</span>.</li>
              <li>Only if you prefer to create the webhook yourself (<span className="font-semibold text-ink">Developers → Webhooks → Add endpoint</span>, that URL, event <span className="font-mono">checkout.session.completed</span>): paste its signing secret (<span className="font-mono">whsec_…</span>) in the second field.</li>
            </ol>
            {!stripe.canStore && <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">The server has no SETTINGS_SECRET yet, so pasted keys can't be stored safely. Ask your developer to set it.</p>}
            <StripeConnect canStore={stripe.canStore} />
          </>
        )}
      </section>

      <section className="card space-y-5 p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-medium">Email receipts</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${mail.connected ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{mail.connected ? "Sending" : "Not connected"}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">
          After every card payment the buyer gets a receipt: what they bought, the amount, the card, a button straight to what they paid for, and Stripe&apos;s own receipt.
          It goes to the email they sign in with (for a company purchase, the email of the person who paid), in the language they were using.
        </p>
        {mail.connected ? (
          <>
            <p className="text-sm leading-relaxed text-ink-2">
              Sent from <span className="font-semibold text-ink">{mail.fromName} &lt;{mail.from}&gt;</span>; replies go to <span className="font-semibold text-ink">{LEGAL.support}</span>
              {mail.source === "portal" && mail.savedAt ? ` · connected by ${mail.savedBy} on ${mail.savedAt.slice(0, 10)}` : mail.source === "environment" ? " · set in the server environment" : ""}.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <SampleReceipt />
              {mail.source === "portal" && <form action={disconnectEmailAction}><button type="submit" className="btn btn-quiet btn-danger">Disconnect mailbox</button></form>}
            </div>
          </>
        ) : (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
              <li>Receipts are sent through Google, which already runs the mail of <span className="font-mono">{LEGAL.site}</span>, so they arrive from your own address and don&apos;t land in spam. Choose the mailbox they come from, for example <span className="font-mono">{LEGAL.support}</span>.</li>
              <li>Signed in to Google as that mailbox, turn on <span className="font-semibold text-ink">2-Step Verification</span>, then open <span className="font-mono">myaccount.google.com/apppasswords</span> and create an app password called <span className="font-semibold text-ink">AVOCO receipts</span>. Google shows 16 letters once.</li>
              <li>Paste the mailbox and those letters below. The server logs in with them to check, then stores the password encrypted; it is never shown again. The first sample may take a minute.</li>
            </ol>
            {!mail.canStore && <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">The server has no SETTINGS_SECRET yet, so the password can&apos;t be stored safely. Ask your developer to set it.</p>}
            <EmailConnect canStore={mail.canStore} suggested={LEGAL.support} />
          </>
        )}
      </section>

      <section className="card space-y-5 p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-medium">Meta ads (Facebook and Instagram)</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${capiToken() ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{capiToken() ? "Pixel + server" : "Pixel only"}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">
          Pixel <span className="font-mono text-ink">{pixelId()}</span> runs on the main site for visitors who allow advertising, never in an admin&apos;s browser.
          It reports page views and each step: CompleteRegistration (sign-up), RecordVoice (recording), StartTrial (free first report), InitiateCheckout and Purchase.
          {capiToken()
            ? " The server sends the same steps through the Conversions API with the same event ids, so each counts once, even where a browser blocks the pixel."
            : " Add META_CAPI_TOKEN in Vercel to send the server-side copies too."}
        </p>
        {capiToken() && <MetaStatus status={await pixelStatus()} now={Date.now()} />}
        {capiToken() && (
          <>
            <p className="text-sm leading-relaxed text-ink-2">To check the server&apos;s token: in Events Manager open the pixel → <span className="font-semibold text-ink">Test events</span>, copy the code under &quot;Test server events&quot; (it starts with TEST) and send one here.</p>
            <MetaTest />
          </>
        )}
      </section>

      <PricingForm
        save={saveSettingsAction}
        names={NAMES}
        stripeConnected={stripe.connected}
        current={{
          enabled: cfg.enabled, firstFree: cfg.freeFirstReport, currency: cfg.currency, packs: cfg.packs, freePreviews: cfg.freePreviewsPer30Days, trialCredits: cfg.workspaceTrialCredits,
          industryCents: addonCents, bestCents, bestCredits: bestN, matchCents, matchCredits: matchN,
        }}
      />

      <section className="card space-y-5 p-7 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-medium">Languages</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${deepl.connected ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{deepl.connected ? "DeepL connected" : "English + Russian"}</span>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">
          English is the original and Russian is translated by hand; both are always on. Any other language is made from the English by DeepL:
          connect a DeepL API key (a free account at deepl.com/pro-api gives 500,000 characters a month; one language is about {fmt(languageSize)} characters),
          then add languages below. Each is translated once and kept; when the English changes, only the changed strings are redone.
          Voice recordings can be in any language regardless.
        </p>
        {deepl.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-2">
            <p>
              Key <span className="font-mono">{deepl.keyHint}</span>
              {deepl.usage ? ` · ${fmt(deepl.usage.used)} of ${fmt(deepl.usage.limit)} characters used this period` : ""}
              {deepl.source === "portal" && deepl.savedAt ? ` · added by ${deepl.savedBy} on ${deepl.savedAt.slice(0, 10)}` : deepl.source === "environment" ? " · set in the server environment" : ""}.
            </p>
            {deepl.source === "portal" && <form action={disconnectDeeplAction}><button type="submit" className="rounded-md border border-line px-3 py-1 text-xs hover:border-ink-2">Disconnect DeepL</button></form>}
          </div>
        ) : (
          <>
            {!deepl.canStore && <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">The server has no SETTINGS_SECRET yet, so a pasted key can't be stored safely.</p>}
            <KeyConnect action={connectDeeplAction} name="key" label="DeepL API key (deepl.com → Account → API keys)" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx" button="Connect DeepL" canStore={deepl.canStore} />
          </>
        )}
        {deepl.connected && <LanguageBuilderAll languages={TRANSLATABLE.filter((l) => { const p = progress.get(l.code); return !p || p.done < p.total; }).map(({ code, name }) => ({ code, name }))} />}
        <ul className="grid gap-x-8 divide-y divide-line text-sm sm:grid-cols-2 sm:divide-y-0">
          {TRANSLATABLE.map((l) => {
            const p = progress.get(l.code) ?? { total: 0, done: 0 };
            return (
              <li key={l.code} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                <span><span lang={l.code} className="font-medium text-ink">{l.name}</span> <span className="text-xs uppercase text-muted">{l.code}</span></span>
                <span className="flex items-center gap-3">
                  {deepl.connected ? <LanguageBuilder lang={l.code} done={p.done} total={p.total || languageSize} /> : <span className="text-xs text-muted">{p.done > 0 && p.done >= p.total ? "Ready" : "—"}</span>}
                  {p.done > 0 && <form action={removeLanguageAction}><input type="hidden" name="lang" value={l.code} /><button type="submit" className="rounded-md border border-line px-3 py-1 text-xs hover:border-ink-2">Remove</button></form>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

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
