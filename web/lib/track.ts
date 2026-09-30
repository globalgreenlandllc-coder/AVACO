/**
 * Conversion events for the ad platforms, pushed to Google Tag Manager's data layer (GTM-NJTJ3D4V). Tags in Tag Manager
 * (Meta Pixel, TikTok Pixel, X Pixel, Google Ads, GA4) fire on these; they carry no name, email or recording.
 *
 *   sign_up          a new account, once          event_id, method ("email" | "google")
 *   record_voice     a recording sent for analysis event_id
 *   free_report      the free first report opened  event_id
 *   begin_checkout   on the way to Stripe          event_id, item
 *   purchase         a payment confirmed           event_id, value, currency, item, ecommerce{…}
 *
 * Every event has an event_id, so a platform counts it once (also against a server-side copy later). The same id is
 * never pushed twice from one browser. Admins' browsers push nothing.
 */
declare global { interface Window { dataLayer?: unknown[]; __avocoNoTrack?: boolean } }

const SEEN = "avoco-tracked";

export function track(event: string, params: { event_id: string } & Record<string, unknown>): void {
  if (typeof window === "undefined" || window.__avocoNoTrack) return;
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN) ?? "[]") as string[];
    if (seen.includes(params.event_id)) return;
    localStorage.setItem(SEEN, JSON.stringify([...seen, params.event_id].slice(-300)));
  } catch { /* counted anyway */ }
  window.dataLayer = window.dataLayer ?? [];
  if (event === "purchase") window.dataLayer.push({ ecommerce: null }); // Google's advice: clear the previous ecommerce object first
  window.dataLayer.push({ event, ...params });
}

/** Tells the ad platforms a checkout started, then goes to Stripe (a moment later, so the tags can send). */
export function goToCheckout(url: string, item: string): void {
  track("begin_checkout", { event_id: `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, item });
  setTimeout(() => { window.location.href = url; }, 250);
}

/** A short, one-way stand-in for an account id, for event ids: the platforms never see the account itself. */
export async function hashId(id: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`avoco:${id}`));
    return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return id.slice(-12);
  }
}

/** What a purchase was, in one word, for the "item" of a purchase event. */
export function purchaseItem(p: { pack: string; credits: number; giftId?: string | null; matchId?: string | null; unlockIndustry?: string | null; recordingUrl?: string | null }): string {
  if (p.giftId) return "gift";
  if (p.matchId) return "relationship";
  if (p.unlockIndustry === "best") return "best_industry";
  if (p.unlockIndustry) return "career_fit";
  if (p.recordingUrl) return "report";
  return p.credits === 1 ? "report" : `credits_${p.credits}`;
}
