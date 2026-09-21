import { baseUrl } from "@/lib/page";
import { FIELDS } from "@/lib/fit";

export const metadata = { title: "AVOCO · Company API" };

const Code = ({ children }: { children: string }) => <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed"><code>{children}</code></pre>;

export default async function ApiDocsPage() {
  const origin = await baseUrl();
  return (
    <article className="max-w-3xl space-y-10">
      <div>
        <p className="eyebrow">Company API</p>
        <h1 className="mt-3 font-display text-5xl font-medium">Send recordings from your own software</h1>
        <p className="mt-4 leading-relaxed text-ink-2">
          Two calls: send a recording, then read the result about a minute later. Create an API key in your workspace
          (Settings → API access; admins only) and send it with every request. Keep it on your server, never in a browser or a mobile app.
        </p>
        <Code>{`Authorization: Bearer avk_your_key`}</Code>
      </div>

      <section>
        <h2 className="font-display text-3xl font-medium">1. Send a recording</h2>
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
        <h2 className="font-display text-3xl font-medium">2. Read the result</h2>
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
  "best_fit": [{ "field": "research", "score": 42.8 }, …],
  "error": null
}`}</Code>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-2">
          <li><code>psytype</code>: eight personality types, 0 to 100, highest first. Zones: 50 and up <code>leading</code>, 30 to 49.9 <code>active</code>, below 30 <code>background</code>.</li>
          <li><code>emostate</code>: fourteen emotional scales, 0 to 100. <code>null</code> when your workspace hides emotional state.</li>
          <li><code>best_fit</code>: this platform's fit score for fields of work: {Object.keys(FIELDS).join(", ")}.</li>
          <li><code>error</code>: <code>analysis_failed</code> (usually audio too short, too quiet or an unsupported format) or <code>timeout</code>.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl font-medium">Errors</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">Always JSON: <code>{`{"error":"<code>","message":"…"}`}</code></p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
          <li><code>400 bad_request</code>: no file, file over 4 MB, or <code>consent</code> missing</li>
          <li><code>401 unauthorized</code>: API key missing or wrong</li>
          <li><code>404 not_found</code>: no such analysis in your workspace</li>
          <li><code>429 limit_reached</code>: your workspace's monthly limit is used up</li>
          <li><code>502 upstream_error</code>: the analysis service is unavailable; try again later</li>
        </ul>
      </section>
    </article>
  );
}
