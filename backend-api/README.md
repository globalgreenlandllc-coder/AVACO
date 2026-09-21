# AVOCO Gateway API

Your own API in front of AVOCO voice analysis. Your platform calls this API with a permanent API key.
This API logs in to AVOCO (and refreshes its 15-minute token), sends the audio for analysis, stores every
result in Postgres, and returns the results in a readable shape. Backend only, no UI.

- Next.js route handlers (Node runtime) on Vercel, TypeScript strict
- Postgres on Neon with Drizzle ORM and migrations
- Vercel Blob for audio files
- Vitest tests

## How an analysis works

1. Upload the recording to Vercel Blob through `POST /api/v1/uploads`. You get back an `https://…blob.vercel-storage.com/…` URL.
2. Create the analysis with `POST /api/v1/analyses`, passing that URL and `"consent": true`.
   - `mode: "async"` (default): you get `202` with an id straight away. AVOCO posts its results to our webhook later.
   - `mode: "sync"`: the request waits for AVOCO and returns the finished analysis.
3. Read it with `GET /api/v1/analyses/:id` until `status` is `completed` or `failed`.

Audio rules (set by AVOCO): 30 seconds to 10 minutes, at most 10 MB; wav (mono, 16-bit, 16 kHz recommended),
mp3, ogg, m4a or opus.

## Setup

```bash
cd backend-api
npm install
cp .env.example .env.local      # then fill it in, or: vercel env pull .env.local
npm run db:migrate              # creates the tables
npm run dev
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/v1/health
```

Scripts: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run db:generate`, `npm run db:migrate`.

## Environment variables

All of them are server-only. Never prefix one with `NEXT_PUBLIC_`, never commit them, never log them.
On Vercel: Settings → Environment Variables, and mark each one Sensitive.

| Name | Required | What it is |
|---|---|---|
| `AVOCO_API_USER` | yes | AVOCO username |
| `AVOCO_API_PASSWORD` | yes | AVOCO password, without quotes |
| `AVOCO_BASE_URL` | no | AVOCO server. Default `https://voice.voxera.kz` |
| `PLATFORM_API_KEYS` | yes | Your permanent API keys, comma-separated. Generate each with `openssl rand -hex 32` |
| `AVOCO_CALLBACK_SECRET` | yes | Protects the webhook (AVOCO callbacks are unsigned). Generate with `openssl rand -hex 32` |
| `APP_BASE_URL` | yes | Public **production** URL of this API, e.g. `https://avoco-gateway.vercel.app`. Callback URLs are built from it |
| `DATABASE_URL` | yes | Postgres connection string. Set for you by the Neon integration |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob token. Set for you when a Blob store is connected |
| `ALLOWED_AUDIO_HOSTS` | no | Hosts `audio_url` may point to, comma-separated. A leading dot means any subdomain. Default `.blob.vercel-storage.com` |

To revoke an API key, remove it from `PLATFORM_API_KEYS` and redeploy. Keys don't expire otherwise.

If `APP_BASE_URL` is empty, the API falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. Set `APP_BASE_URL`
yourself when you use a custom domain.

## Database migrations

The schema is in `lib/db/schema.ts`; the SQL migrations are in `drizzle/`.

```bash
npm run db:migrate     # apply migrations to DATABASE_URL (reads .env.local or .env)
npm run db:generate    # after changing schema.ts: writes a new migration file into drizzle/
```

Run `db:migrate` against the production database before the first deploy, and again whenever a new
migration file appears. Commit the generated files.

Tables: `analyses` (one row per request: status, consent time, formatted results) and `avoco_jobs`
(one row per AVOCO job; its id is the id sent to AVOCO; keeps the raw result). Deleting an analysis deletes its jobs.

## Deploy to Vercel

1. Import the Git repository in Vercel and set **Root Directory = `backend-api`**.
2. Storage → add **Neon** (Postgres) from the Marketplace and connect it to the project. This sets `DATABASE_URL`.
3. Storage → add a **Blob** store and connect it. This sets `BLOB_READ_WRITE_TOKEN`.
4. Add the remaining environment variables from the table above.
5. Run the migrations against the production database:
   ```bash
   vercel link && vercel env pull .env.local --environment=production
   npm run db:migrate
   ```
6. Deploy, then check it: `curl -H "x-api-key: YOUR_KEY" https://YOUR-DOMAIN/api/v1/health`

`POST /api/v1/analyses` and `POST /api/v1/analyze` set `maxDuration = 300` seconds, because sync mode waits for
AVOCO. Lower it if your Vercel plan allows less.

> **Webhooks must use the production domain.** Vercel preview deployments are protected by default
> (Deployment Protection asks for a Vercel login), so AVOCO's callbacks to a preview URL would be blocked and
> every async analysis would end in `timeout`. Always set `APP_BASE_URL` to the production URL. For local
> testing use `mode: "sync"`, or put a public tunnel URL in `APP_BASE_URL`.

## Endpoints

Every `/api/v1` route needs your API key, as `Authorization: Bearer <key>` or `x-api-key: <key>`.
The examples use:

```bash
export API=https://YOUR-DOMAIN
export KEY=your-platform-api-key
```

### GET /api/v1/health

Checks your key and that AVOCO login works.

```bash
curl -H "Authorization: Bearer $KEY" $API/api/v1/health
# 200 {"status":"ok","avoco":"connected"}      502 if AVOCO login fails
```

### POST /api/v1/uploads

Token handler for Vercel Blob client uploads: `audio/*` only, at most 10 MB. The file goes straight from the
uploader to Blob, which is how it gets past Vercel's ~4.5 MB request limit. Use the Blob SDK rather than calling
the route by hand:

```ts
import { upload } from "@vercel/blob/client";

const blob = await upload("recording.m4a", file, {
  access: "public",
  handleUploadUrl: `${API}/api/v1/uploads`,
  headers: { "x-api-key": KEY },       // call this from your server, so the key stays secret
});
// blob.url is the audio_url for POST /api/v1/analyses
```

What the SDK sends:

```bash
curl -X POST $API/api/v1/uploads -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"type":"blob.generate-client-token","payload":{"pathname":"recording.m4a","callbackUrl":"","multipart":false,"clientPayload":null}}'
# 200 {"type":"blob.generate-client-token","clientToken":"vercel_blob_client_..."}
```

### POST /api/v1/analyses

| Field | | |
|---|---|---|
| `audio_url` | required | https URL on an allowed host (see `ALLOWED_AUDIO_HOSTS`) |
| `consent` | required | Must be exactly `true`: the person recorded agreed to the analysis. The time is stored as `consent_at` |
| `type` | optional | `both` (default), `psytype` or `emostate` |
| `mode` | optional | `async` (default) or `sync` |
| `channel` | optional | `0` = left, `1` = right, for stereo recordings |
| `external_user_id` | optional | Your platform's user id, used to filter history |

Async (default):

```bash
curl -X POST $API/api/v1/analyses -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"audio_url":"https://xxxx.public.blob.vercel-storage.com/recording-abc.m4a","type":"both","external_user_id":"user-42","consent":true}'
# 202 {"id":"3f0e6c0e-...","status":"processing"}
```

Sync (waits for AVOCO, returns the full analysis, shape below):

```bash
curl -X POST $API/api/v1/analyses -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"audio_url":"https://xxxx.public.blob.vercel-storage.com/recording-abc.m4a","mode":"sync","consent":true}'
```

If AVOCO refuses the audio, the analysis is stored as `failed` and the error response carries its id as `analysis_id`.

### GET /api/v1/analyses/:id

```bash
curl -H "Authorization: Bearer $KEY" $API/api/v1/analyses/3f0e6c0e-...
```

```json
{
  "id": "3f0e6c0e-...",
  "status": "completed",
  "type": "both",
  "external_user_id": "user-42",
  "created_at": "2026-09-21T10:00:00.000Z",
  "completed_at": "2026-09-21T10:00:41.000Z",
  "psytype":  [{ "key": "driver", "label": "Driver", "value": 68.6, "zone": "leading" }],
  "emostate": [{ "key": "self_control", "label": "Self-control", "value": 84 }],
  "error": null
}
```

- `status`: `processing`, `completed` or `failed`. An analysis still processing after 15 minutes becomes `failed`
  with `"error": "timeout"`. If AVOCO's result arrives after that, it is still saved and the analysis becomes `completed`.
- `psytype`: sorted by value, highest first; values rounded to 1 decimal. Zones: 50 and up `leading`, 30 to 49.99 `active`, below 30 `background`.
- `emostate`: sorted by value, highest first; values rounded to whole numbers.
- A result you didn't ask for (for example `emostate` when `type` is `psytype`) is `null`.
- A scale name this API doesn't know yet is passed through, with `label` equal to the name.

### GET /api/v1/analyses

History, newest first. `external_user_id` filters by user, `limit` is 1 to 100 (default 20).

```bash
curl -H "Authorization: Bearer $KEY" "$API/api/v1/analyses?external_user_id=user-42&limit=20"
# 200 {"data":[ {analysis}, ... ],"next_cursor":"MjAyNi0wOS0yMVQ..."}

# next page: pass next_cursor back. next_cursor is null on the last page.
curl -H "Authorization: Bearer $KEY" "$API/api/v1/analyses?external_user_id=user-42&limit=20&cursor=MjAyNi0wOS0yMVQ..."
```

### DELETE /api/v1/analyses/:id

Deletes the analysis, its jobs, and its audio file from Blob, so users can have their data removed.

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" $API/api/v1/analyses/3f0e6c0e-...
# 200 {"id":"3f0e6c0e-...","deleted":true,"audio_deleted":true}
```

The audio is deleted first. If Blob fails you get `502` and the record is kept, so you can simply retry.
`audio_deleted` is `false` when the audio is on another allowed host (for example your own S3), which this API can't delete from.

### POST /api/webhooks/avoco?secret=…

AVOCO calls this, not your platform. There is no API key; the `secret` query parameter must equal
`AVOCO_CALLBACK_SECRET`. The API builds this URL itself and gives it to AVOCO with each async job.

```bash
curl -X POST "$API/api/webhooks/avoco?secret=$AVOCO_CALLBACK_SECRET" -H "Content-Type: application/json" \
  -d '{"id":"<avoco job id>","psy_types":[{"id":2,"name":"driver","value":68.64}]}'
# 200 {"ok":true,"duplicate":false}     404 for an unknown id     401 for a wrong secret
```

It saves the raw result, marks the job completed and writes the formatted result into the analysis. When every
job of an analysis has reported, the analysis becomes `completed`. A repeated callback changes nothing and
answers `{"ok":true,"duplicate":true}`.

### POST /api/v1/analyze (stateless quick test)

The original endpoint, kept as it was: analyses one file and returns the result without storing anything.

```bash
# JSON, for a file already in Blob
curl -X POST $API/api/v1/analyze -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"audio_url":"https://xxxx.public.blob.vercel-storage.com/recording-abc.m4a","type":"both","channel":0}'

# multipart, for small files (under ~4.5 MB on Vercel)
curl -X POST $API/api/v1/analyze -H "Authorization: Bearer $KEY" -F file=@recording.m4a -F type=psytype
# 200 {"type":"both","psytype":[...],"emostate":[...],"duration_ms":8400}
```

## Errors

Errors are always JSON: `{"error":"<code>","message":"..."}`.

| Status | `error` | Meaning |
|---|---|---|
| 400 | `bad_request` | Bad input: consent missing, `audio_url` not https or on a host that isn't allowed, file over 10 MB, bad field |
| 401 | `unauthorized` | API key (or webhook secret) missing or wrong |
| 404 | `not_found` | No analysis (or AVOCO job) with that id |
| 422 | `analysis_failed` | AVOCO rejected the audio, usually too short or the wrong format. `message` carries AVOCO's reason |
| 502 | `upstream_error` | AVOCO returned a 5xx or couldn't be reached. Try again later |
| 500 | `server_misconfigured` / `internal_error` | A required environment variable is missing, or an unexpected error |

AVOCO tokens and stack traces are never returned. Upstream errors are logged server-side only (Vercel → Logs).

## Code layout

```
app/api/v1/health            GET     key + AVOCO login check
app/api/v1/uploads           POST    Blob client-upload tokens
app/api/v1/analyses          POST    create    GET  history
app/api/v1/analyses/[id]     GET     read      DELETE  delete with audio
app/api/v1/analyze           POST    stateless quick test
app/api/webhooks/avoco       POST    AVOCO result callbacks
lib/avoco.ts      AVOCO client: login, refresh 60 s before expiry, re-login if refresh fails, one retry on 401
lib/auth.ts       API key and webhook secret checks (timing-safe)
lib/analyses.ts   creating analyses, running jobs, recording results, timeout, history
lib/audio.ts      input parsing and the guarded audio download (SSRF block)
lib/format.ts     labels, zones, rounding, the public analysis shape
lib/http.ts       error responses
lib/db/           Drizzle schema and client
drizzle/          SQL migrations
tests/            Vitest: a real local HTTP server plays AVOCO; an in-memory Postgres runs the real migrations
```
