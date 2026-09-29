import Link from "next/link";
import { FIELDS } from "@/lib/fit";
import { getDict } from "@/lib/i18n";
import { LEGAL } from "@/lib/legal";
import { baseUrl } from "@/lib/page";
import { isPartnerHost } from "@/lib/partners";
import { isOpenHost } from "@/lib/visitor";

export const metadata = { title: "AVOCO · Company API" };

const Code = ({ children }: { children: string }) => <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed"><code>{children}</code></pre>;

/**
 * The company API. Anyone can land here from the footer, so the page opens in the visitor's language with what the API
 * is for and how a company starts; the technical guide for the company's developer follows, in English like its code.
 */
export default async function ApiDocsPage() {
  const [origin, { locale, t }, partner, open] = await Promise.all([baseUrl(), getDict(), isPartnerHost(), isOpenHost()]);
  const a = t.org.apiPage;
  return (
    <article className="space-y-16">
      <header className="max-w-3xl">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl font-medium">{a.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">{a.lead}</p>
      </header>

      <section aria-labelledby="api-start">
        <h2 id="api-start" className="font-display text-3xl font-medium">{a.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {a.steps.map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">{i + 1}</span>
              <h3 className="mt-4 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          {/* The partner and open hosts have no accounts, so no workspace to open there. */}
          {!partner && !open && <Link href="/w" className="btn">{a.open}</Link>}
          <a href={`mailto:${LEGAL.support}`} className="btn btn-quiet">{a.ask}</a>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-6 sm:p-7">
          <h2 className="font-display text-2xl font-medium">{a.getsTitle}</h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed">
            {a.gets.map((line) => <li key={line} className="flex gap-2.5"><span aria-hidden className="text-accent-text">✓</span><span>{line}</span></li>)}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">{a.getsNote}</p>
        </section>
        <section className="card p-6 sm:p-7">
          <h2 className="font-display text-2xl font-medium">{a.consentTitle}</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">{a.consent}</p>
        </section>
      </div>

      <section id="developers" aria-labelledby="api-dev" className="scroll-mt-24 border-t border-line pt-14">
        <p className="eyebrow">{a.devEyebrow}</p>
        <h2 id="api-dev" className="mt-3 font-display text-4xl font-medium">{a.devTitle}</h2>
        {!locale.startsWith("en") && <p className="mt-3 text-sm text-muted">{a.devNote}</p>}
        <div lang="en" dir="ltr" className="mt-8 max-w-3xl space-y-10">
          <div>
            <p className="leading-relaxed text-ink-2">
              Two calls: send a recording, then read the result about a minute later. Create an API key in your workspace
              (Settings → API access; admins only) and send it with every request. Keep it on your server, never in a browser or a mobile app.
            </p>
            <Code>{`Authorization: Bearer avk_your_key`}</Code>
          </div>

          <section>
            <h3 className="font-display text-2xl font-medium">1. Send a recording</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              <code>POST /api/public/v1/analyses</code>, <code>multipart/form-data</code>. The file must hold 30 seconds to 5 minutes of one person speaking,
              as wav, mp3, m4a, ogg or opus, up to 4 MB (16 kHz mono WAV fits about 2 minutes; compressed formats fit the full 5).
              <code> consent=true</code> is required: it is your statement that the recorded person agreed to the analysis.
              Recordings appear in your workspace in a group called "API".
            </p>
            <Code>{`curl -X POST ${origin}/api/public/v1/analyses \\
  -H "Authorization: Bearer $AVOCO_KEY" \\
  -F file=@interview.m4a \\
  -F name="Dana Lee" \\
  -F consent=true

202 {"id":"3f0e6c0e-…","status":"processing"}`}</Code>
          </section>

          <section>
            <h3 className="font-display text-2xl font-medium">2. Read the result</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              <code>GET /api/public/v1/analyses/:id</code>. Ask every 5 to 10 seconds until <code>status</code> is <code>completed</code> or <code>failed</code>.
              A key only ever sees analyses from its own workspace.
            </p>
            <Code>{`curl ${origin}/api/public/v1/analyses/3f0e6c0e-… -H "Authorization: Bearer $AVOCO_KEY"

200 {
  "id": "3f0e6c0e-…",
  "status": "completed",
  "name": "Dana Lee",
  "created_at": "2026-09-21T10:00:00.000Z",
  "completed_at": "2026-09-21T10:00:41.000Z",
  "psytype":  [{ "key": "analyst", "label": "Analyst", "value": 56.4, "zone": "leading" }, …],
  "emostate": [{ "key": "ability_to_attract", "label": "Attractiveness", "value": 76 }, …],
  "best_fit": [{ "field": "research", "sector": "tech", "score": 48.3, "personality_score": 42.8, "state_score": 64.7 }, …],
  "error": null
}`}</Code>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-2">
              <li><code>psytype</code>: eight personality types, 0 to 100, highest first. Zones: 50 and up <code>leading</code>, 30 to 49.9 <code>active</code>, below 30 <code>background</code>.</li>
              <li><code>emostate</code>: fourteen emotional scales, 0 to 100. <code>null</code> when your workspace hides emotional state.</li>
              <li><code>best_fit</code>: this platform's fit score for {Object.keys(FIELDS).length} fields of work, best first. <code>score</code> is three quarters <code>personality_score</code> (from the types) and one quarter <code>state_score</code> (from the emotional scales that work leans on; <code>null</code> when emotional state is hidden, and then <code>score</code> equals <code>personality_score</code>). Fields: {Object.keys(FIELDS).join(", ")}.</li>
              <li><code>error</code>: <code>analysis_failed</code> (usually audio too short, too quiet or an unsupported format) or <code>timeout</code>.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-display text-2xl font-medium">Errors</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">Always JSON: <code>{`{"error":"<code>","message":"…"}`}</code></p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
              <li><code>400 bad_request</code>: no file, file over 4 MB, or <code>consent</code> missing</li>
              <li><code>401 unauthorized</code>: API key missing or wrong</li>
              <li><code>404 not_found</code>: no such analysis in your workspace</li>
              <li><code>429 limit_reached</code>: your workspace's monthly limit is used up</li>
              <li><code>502 upstream_error</code>: the analysis service is unavailable; try again later</li>
            </ul>
          </section>
        </div>
      </section>
    </article>
  );
}
