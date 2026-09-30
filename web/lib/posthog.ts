/**
 * PostHog: session replays (where people click, scroll and hesitate) and the product analytics behind them, for
 * Admin → Statistics. Everything here switches on only when the keys are set:
 *   NEXT_PUBLIC_POSTHOG_KEY   the project API key (phc_…), used in the browser
 *   NEXT_PUBLIC_POSTHOG_HOST  the ingestion host, https://us.i.posthog.com (or eu.i.posthog.com)
 *   POSTHOG_PROJECT_ID        the project's number, for links and the API
 *   POSTHOG_API_KEY           a personal API key (phx_…) with session_recording:read, server only
 */
import "server-only";

export interface PostHogConfig { key: string; host: string; app: string; projectId: string | null; apiKey: string | null }

/** The browser keys, or null when PostHog isn't set up. `app` is where people open PostHog itself. */
export function posthogConfig(): PostHogConfig | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com").replace(/\/$/, "");
  const app = host.replace(/\/\/(us|eu)\.i\./, "//$1.");
  return { key, host, app, projectId: process.env.POSTHOG_PROJECT_ID?.trim() || null, apiKey: process.env.POSTHOG_API_KEY?.trim() || null };
}

/** The address of a visitor's page in PostHog, with their recordings, from the visitor id we identify them by. */
export const personUrl = (cfg: PostHogConfig, visitorKey: string) => (cfg.projectId ? `${cfg.app}/project/${cfg.projectId}/person/${encodeURIComponent(visitorKey)}#activeTab=sessionRecordings` : null);

export interface Replay { id: string; startedAt: string; seconds: number; startUrl: string | null; clicks: number; keypresses: number; errors: number; person: string | null; viewed: boolean; url: string }

/** The newest session recordings, from PostHog's API. Empty when not set up or unreachable. */
export async function recentReplays(limit = 20): Promise<{ replays: Replay[]; ready: boolean; error: string | null }> {
  const cfg = posthogConfig();
  if (!cfg?.projectId || !cfg.apiKey) return { replays: [], ready: false, error: null };
  try {
    const res = await fetch(`${cfg.app}/api/projects/${cfg.projectId}/session_recordings/?limit=${limit}`, { headers: { Authorization: `Bearer ${cfg.apiKey}` }, cache: "no-store" });
    if (!res.ok) return { replays: [], ready: true, error: `PostHog answered ${res.status}` };
    const body = await res.json() as { results: Array<{ id: string; start_time: string; recording_duration: number; start_url: string | null; click_count: number; keypress_count: number; console_error_count?: number; distinct_id: string; viewed: boolean }> };
    return {
      ready: true, error: null,
      replays: body.results.map((r) => ({
        id: r.id, startedAt: r.start_time, seconds: Math.round(r.recording_duration ?? 0), startUrl: r.start_url, clicks: r.click_count ?? 0, keypresses: r.keypress_count ?? 0, errors: r.console_error_count ?? 0,
        person: r.distinct_id, viewed: r.viewed, url: `${cfg.app}/project/${cfg.projectId}/replay/${r.id}`,
      })),
    };
  } catch (err) {
    return { replays: [], ready: true, error: err instanceof Error ? err.message : "unreachable" };
  }
}
