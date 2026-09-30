/**
 * Meta's pixel (Facebook and Instagram ads): its base code, and our conversion events (lib/track.ts) in Meta's words.
 * It runs on the main site only, with advertising consent, and never in an admin's browser (app/layout.tsx). Automatic
 * configuration is off, so Meta doesn't read the page's buttons and text by itself: it hears only the page views and
 * the events below, each with our event id, so a server-side copy of the same event later counts once.
 */
declare global { interface Window { fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] }; _fbq?: unknown } }

export const META_PIXEL_ID = "1558938122217068";
const SRC = "https://connect.facebook.net/en_US/fbevents.js";
const isPixelId = (id: string) => /^\d{6,20}$/.test(id);

/** Meta's base code for the page's <head>: loads the pixel, switches automatic configuration off, sends the page view. */
export function metaPixelScript(id: string): string {
  if (!isPixelId(id)) return "";
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','${SRC}');fbq('set','autoConfig',false,'${id}');fbq('init','${id}');fbq('track','PageView');`;
}

/** The same, started from the browser: for a visitor who allows advertising after the page has loaded. */
export function loadMetaPixel(id: string): void {
  if (typeof window === "undefined" || window.fbq || !isPixelId(id)) return;
  const fbq = ((...args: unknown[]) => { if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args); else fbq.queue!.push(args); }) as NonNullable<Window["fbq"]> & { push?: unknown; loaded?: boolean; version?: string };
  fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0"; fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = SRC;
  document.head.appendChild(script);
  fbq("set", "autoConfig", false, id);
  fbq("init", id);
  fbq("track", "PageView");
}

export interface MetaEvent { name: string; custom: boolean; data: Record<string, unknown> }

/**
 * Our events (lib/track.ts) as Meta names them: its standard events where one fits, so a campaign can aim at them;
 * a custom one for the recording, which has no standard twin.
 */
export function metaEventFor(event: string, params: Record<string, unknown>): MetaEvent | null {
  const text = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  switch (event) {
    case "sign_up": return { name: "CompleteRegistration", custom: false, data: { status: true } };
    case "record_voice": return { name: "RecordVoice", custom: true, data: {} };
    case "free_report": return { name: "StartTrial", custom: false, data: { content_name: "free first report" } };
    case "begin_checkout": return { name: "InitiateCheckout", custom: false, data: { content_name: text(params.item) } };
    case "purchase": {
      const value = typeof params.value === "number" && Number.isFinite(params.value) ? params.value : undefined;
      const currency = text(params.currency)?.toUpperCase();
      return { name: "Purchase", custom: false, data: { value, currency, content_name: text(params.item), content_type: "product" } };
    }
    default: return null;
  }
}

/** Sends one of our events to Meta's pixel, when it is on this page. */
export function sendToMeta(event: string, params: { event_id: string } & Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  const meta = metaEventFor(event, params);
  if (!meta) return;
  const data = Object.fromEntries(Object.entries(meta.data).filter(([, v]) => v !== undefined));
  window.fbq(meta.custom ? "trackCustom" : "track", meta.name, data, { eventID: params.event_id });
}
