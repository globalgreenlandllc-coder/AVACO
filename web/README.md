# AVOCO Web

The platform people use: sign in, record your voice (or upload a recording), and get a report on your
personality profile and emotional state. English and Russian.

It has no database of its own. Analyses live in the gateway (`../backend-api`), filed under the signed-in
user's Clerk id. The gateway API key stays on this app's server; browsers only ever talk to this app.

## How a recording becomes a report

1. `/record`: the browser records the microphone, or takes an audio file. Whatever the source format, it is
   converted in the browser to WAV, mono, 16-bit, 16 kHz (the format AVOCO recommends). 30 seconds to 5 minutes.
2. The person ticks the consent box. Without it nothing is uploaded.
3. The WAV goes straight to Vercel Blob. `/api/upload-token` checks the user and asks the gateway for the upload token.
4. `/api/analyses` starts an async analysis in the gateway with `external_user_id` = the user's id.
5. `/reports/:id` polls every 4 seconds until the gateway's webhook has received AVOCO's results, then shows the report.

Every read and delete checks that the analysis belongs to the signed-in user (`lib/gateway.ts`, `getAnalysisFor`),
so nobody can open another person's report by guessing its id.

## Setup

```bash
cd web
npm install
cp .env.example .env.local   # fill in the gateway URL + key and the Clerk keys
npm run dev                  # http://localhost:3217
```

| Variable | What it is |
|---|---|
| `GATEWAY_URL` | URL of the deployed gateway, e.g. `https://avaco-puce.vercel.app` |
| `GATEWAY_API_KEY` | One of the gateway's `PLATFORM_API_KEYS`. Server-only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | From the Clerk dashboard → API keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, `..._FALLBACK_REDIRECT_URL` | Keep the values from `.env.example` |

Scripts: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`.

## Deploy to Vercel

A second Vercel project from the same repository, with **Root Directory = `web`**, and the variables above.

## For companies

A company gets a **workspace** (`/w`): members with roles (admin, manager, viewer), **groups** (a vacancy, a class,
a team) and an **industry preset** (`lib/presets.ts`) that changes the wording, the "in focus" box on a person's
report, and the safeguards. Company data lives in this app's own tables (`lib/db/schema.ts`, migrations in
`drizzle/`, log table `__drizzle_migrations_web`) in the same Neon database as the gateway. Analyses stay in the
gateway, filed under `g:<groupId>`.

Four ways a recording comes in:

| Way | Where | Notes |
|---|---|---|
| Personal invite | `/r/<token>` | No account. The person records, always sees their own report there, and can erase it |
| One link for a group | `/s/<openToken>` | The visitor types their name, then continues at their own `/r/<token>` |
| Station mode | `/s/<openToken>?station=1` | A tablet on site. After each recording: a QR code to the person's report, then "next person" |
| Upload / API | group page, `/api/public/v1/analyses` | Existing files (left or right channel of a stereo call can be chosen), or the company's own software. API docs: `/docs/api` |

Rules built into `lib/workspaces.ts` (every function checks membership first; tests in `tests/workspaces.test.ts`):
consent is required and names the company; a non-member gets 404 for everything; the person can erase their data,
which removes it for the company too; the API key is shown once and only its hash is stored; a monthly limit per
workspace (`REPORTS_PER_MONTH_LIMIT`, default 200) guards open links and is the hook for billing.

Extra environment variable: `DATABASE_URL` (the same Neon database as the gateway). Run `npm run db:migrate` after
pulling new migrations.

## Partner page

`https://avoco-partners.vercel.app` is a free Vercel host attached to the same project. On that host, `/` is the
partner page (`app/partners`): record or upload, wait about a minute, read the full report. No account, no
credits, no billing. Analyses are filed in the gateway under the owner `partners`; a report is reachable by its
id at `/partners/r/<id>` and is remembered in the browser's local storage. On any other host (the main domain
included) the partner paths redirect to the partner host, so the page never appears on `avocousa.us`
(`proxy.ts`). `PARTNER_DAILY_LIMIT` (default 100 recordings a day across everyone) caps the AVOCO usage an open
page can cause; `PARTNER_HOST` changes the host. Logic in `lib/partners.ts`.

## Where things are

```
app/page.tsx                 landing
app/record                   recorder page
app/reports, reports/[id]    history and the report
app/api/upload-token         Blob upload token (user-checked proxy to the gateway)
app/api/analyses             start / read / delete an analysis, always scoped to the signed-in user
components/Recorder.tsx      microphone, timer, level meter, file upload, consent
components/ReportView.tsx    processing, failed and completed report states
components/Bars.tsx          the 0 to 100 bars
lib/gateway.ts               server-only gateway client and the ownership check
lib/wav.ts                   decoding + 16 kHz mono WAV encoding in the browser
lib/report.ts                report logic: localized rows, leading types, failure wording
lib/i18n/                    en.ts and ru.ts (every screen and every scale description), locale detection
proxy.ts                     Clerk: which routes need sign-in
```

## Where the explanations come from

The AVOCO API returns scores only: every result item is `{id, name, value}`. There is no explanation text in
the API and no endpoint that serves one (checked 2026-09-21). The report's content therefore lives in this app:

| File | What it holds | Source |
|---|---|---|
| `lib/i18n/types-en.ts`, `types-ru.ts` | The official description of all 8 types, and the full official report per type: mindset, role in the team, motivation, resources, communication, behaviour under stress, relationships, compatibility | AVOCO's original report ("Vocal Psychotyping System"). Russian translated here from the English |
| `lib/i18n/deep-en.ts`, `deep-ru.ts` | Zone texts, a short reading per type (strengths, watch-outs, how to talk, where it fits), readings of the 14 emotional scales at high (60+), moderate (35 to 59) and low, and "How this analysis works" | Written for this app. The type readings are drawn from AVOCO's descriptions; the method section from Voxera's published description of the engine: https://rikatv.kz/evrika/aktsii/voxera.html |
| `lib/fit.ts` | "Where you can do your best work": a 0 to 100 fit score for eleven fields of work. Each field is tied to the types whose AVOCO descriptions name that kind of work, with weights; the score is the weighted average of the person's type scores | Calculated by this app. AVOCO's API has no such score. The weights are a judgement and are the place to tune it |
| `lib/report.ts` | Picks the content for each score and assembles the panel behind every row | |

**All eight types have their full official reports** (the `full` object on each profile in `types-en.ts`, with the
Russian translation in `types-ru.ts`). When AVOCO sends a corrected text, edit it there; nothing else needs to
change, the page and the PDF pick it up. A type whose `full` is missing falls back to the short reading with a note
saying the full report isn't added yet.

AVOCO does not say which voice features produced an individual score, so the report never claims to.
