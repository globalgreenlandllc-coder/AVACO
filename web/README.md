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

AVOCO returns scores only: every result item is `{id, name, value}`. There is no explanation, reason or
recommendation in the API, and no endpoint that serves one (checked 2026-09-21; Voxera's own Telegram bot
builds its report text on its own backend the same way). So the interpretation layer lives here:

- `lib/i18n/deep-en.ts`, `deep-ru.ts`: for each of the 8 types, the essence, strengths, watch-outs, how to talk
  with the type and where it shines; for each of the 14 scales, what it reflects and a reading for a high
  (60+), moderate (35 to 59) and low score; the text for each zone; and the "How this analysis works" section.
- `lib/report.ts` picks the text that matches the person's actual score and writes the summary lines.

The method section is based on Voxera's published description of the engine (voice features, ML ensemble,
70 to 90 percent accuracy in their internal studies with 3,000+ respondents):
https://rikatv.kz/evrika/aktsii/voxera.html. The type and scale texts were written for this app from the
scale names. Replace them with AVOCO's official descriptions if they provide them.

AVOCO does not say which voice features produced an individual score, so the report never claims to.
