/**
 * The numbers behind Admin → Statistics, computed from plain visit rows (lib/db/schema.ts `visits`) so they can be
 * tested without a database. Days are UTC like the rest of the admin; the busiest weekdays and hours are shown in
 * New York time, where the company is.
 */
export type Site = "main" | "partner" | "open";
export type Device = "phone" | "tablet" | "desktop";
export interface VisitRow {
  at: Date; site: Site; path: string; visitor: string; session: string; userId: string | null; landing: boolean;
  source: string | null; country: string | null; device: Device; locale: string | null;
  /** A tagged link's campaign, medium and content; the referring page. Absent on rows from before they were kept. */
  campaign?: string | null; medium?: string | null; content?: string | null; referrer?: string | null;
  /** Which ad click id the landing link carried (fbclid, ttclid…), and the visitor's town and whole-degree position, from the edge. */
  click?: string | null; city?: string | null; lat?: number | null; lon?: number | null;
  /** A tagged link's utm_term (for Meta, the placement); seconds on screen, percent scrolled into view and the controls tapped (null before these were kept). */
  term?: string | null; seenS?: number | null; scrollPct?: number | null; taps?: string | null;
}

const DAY = 86_400_000;
export const ZONE = "America/New_York";
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A page's name for the admin's eyes, in place of its path: "Landing page" rather than "/", "A report" rather than
 * "/reports/[id]". The list follows the app's routes; a path not on it is shown without slashes.
 */
const PAGE_NAMES: Array<[RegExp, string]> = [
  [/^\/$/, "Landing page"],
  [/^\/sample/, "Sample report"],
  [/^\/couples/, "Couples page"],
  [/^\/technology/, "The technology page"],
  [/^\/privacy/, "Privacy policy"],
  [/^\/terms/, "Terms of service"],
  [/^\/docs\/api/, "Company API docs"],
  [/^\/sign-up/, "Sign-up"],
  [/^\/sign-in/, "Sign-in"],
  [/^\/record/, "Recording page"],
  [/^\/reports\/\[id\]/, "A report"],
  [/^\/reports/, "My reports"],
  [/^\/credits/, "Credits and prices"],
  [/^\/gift\/\[id\]/, "A gift, after buying"],
  [/^\/gift/, "Gift builder"],
  [/^\/g\//, "Gift link, as the recipient"],
  [/^\/match\//, "Couple's report"],
  [/^\/m\//, "Partner's private link"],
  [/^\/w\/\[id\]\/g\/\[id\]\/p\//, "Company workspace · a person"],
  [/^\/w\/\[id\]\/g\//, "Company workspace · a group"],
  [/^\/w\/\[id\]/, "Company workspace"],
  [/^\/w$/, "Companies"],
  [/^\/join/, "Company invitation"],
  [/^\/r\//, "Personal recording invite"],
  [/^\/s\//, "Open recording link"],
  [/^\/partners\/r\//, "Partner test report"],
  [/^\/partners/, "Partner page"],
  [/^\/preview/, "Design preview"],
];
export function pageName(path: string): string {
  for (const [re, name] of PAGE_NAMES) if (re.test(path)) return name;
  return path.replace(/\[id\]/g, "…").split("/").filter(Boolean).join(" › ") || "Landing page";
}

/** A page with its ids taken out, so /reports/abc and /reports/def count as one page. */
export function normalizePath(raw: string): string {
  const path = (raw.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  if (!path.startsWith("/")) return "/";
  return path.split("/").map((seg) => (isId(seg) ? "[id]" : seg)).join("/").slice(0, 120);
}
const isId = (seg: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || (/^[A-Za-z0-9_-]{16,}$/.test(seg) && /\d/.test(seg));

/** Where a session came from: the campaign's own word (utm_source) when there is one, otherwise the referring site. */
/**
 * Click ids the ad platforms add to a link: which platform, and whether the click was paid. fbclid is added to every
 * link clicked in Facebook or Instagram, paid or not, so it names the platform but doesn't prove an ad.
 */
export const CLICK_IDS: Record<string, { platform: string; paid: boolean }> = {
  ttclid: { platform: "tiktok", paid: true }, twclid: { platform: "x", paid: true }, gclid: { platform: "google", paid: true },
  gbraid: { platform: "google", paid: true }, wbraid: { platform: "google", paid: true }, msclkid: { platform: "bing", paid: true },
  fbclid: { platform: "facebook", paid: false },
};

/**
 * utm_source spellings that mean one platform, including Meta's {{site_source_name}} values (fb, ig, msg, an). "an" is
 * Meta's Audience Network, its ads inside other apps: counted apart from Facebook, since its taps are often accidental.
 */
const ALIASES: Array<[RegExp, string]> = [
  [/^(ig|insta|instagram)([._-]|$)/, "instagram"],
  [/^(an|audience[._-]?network)([._-]|$)/, "audience-network"],
  [/^(fb|facebook|meta|msg|messenger)([._-]|$)/, "facebook"],
  [/^(x|tw|twitter)([._-]|$)/, "x"],
  [/^(tt|tiktok|tik[._-]tok)([._-]|$)/, "tiktok"],
  [/^(google|gads|adwords)([._-]|$)/, "google"],
  [/^(yt|youtube)([._-]|$)/, "youtube"],
];

/** The in-app browsers of the big apps, which often send no referrer at all: a visit from inside the app still counts for it. */
export function inAppPlatform(userAgent: string | null | undefined): string | null {
  const ua = userAgent ?? "";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/.test(ua)) return "facebook";
  if (/musical_ly|BytedanceWebview|TikTok|trill_/i.test(ua)) return "tiktok";
  if (/Twitter/i.test(ua)) return "x";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Snapchat/i.test(ua)) return "snapchat";
  return null;
}

/**
 * Where a session came from, most certain first: a tagged link's utm_source (its spellings folded into one platform),
 * an ad click id, the referring site, the app's own browser, and otherwise direct.
 */
export function sourceOf(utmSource: string | null | undefined, referrer: string | null | undefined, ownHosts: string[], hints: { click?: string | null; userAgent?: string | null } = {}): string {
  const utm = (utmSource ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (utm) return ALIASES.find(([re]) => re.test(utm))?.[1] ?? utm;
  const app = inAppPlatform(hints.userAgent);
  const click = hints.click ? CLICK_IDS[hints.click] : undefined;
  if (click) return click.platform === "facebook" && app === "instagram" ? "instagram" : click.platform;
  let host = "";
  try { host = referrer ? new URL(referrer).hostname.toLowerCase() : ""; } catch { host = ""; }
  if (!host) return app ?? "direct";
  const h = host.replace(/^(www|m|l|lm|mobile|out|away|amp)\./, "");
  const own = ownHosts.map((o) => o.toLowerCase().replace(/^www\./, "")).filter(Boolean);
  if (own.some((o) => h === o || h.endsWith(`.${o}`))) return "direct";
  const known: Array<[RegExp, string]> = [
    [/(^|\.)google\./, "google"], [/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
    [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "x"], [/(^|\.)tiktok\.com$/, "tiktok"], [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)linkedin\.com$/, "linkedin"], [/(^|\.)bing\.com$/, "bing"], [/(^|\.)yandex\./, "yandex"], [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
    [/(^|\.)(t\.me|telegram\.(org|me))$/, "telegram"], [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"], [/(^|\.)reddit\.com$/, "reddit"], [/(^|\.)pinterest\./, "pinterest"],
  ];
  for (const [re, name] of known) if (re.test(h)) return name;
  return h.slice(0, 60);
}

/** An ad visit: a tagged link marked paid (utm_medium cpc, paid, paid_social…) or a paid click id. */
const PAID_MEDIUM = /^(cpc|ppc|paid|paid[._-]?(social|search|media)|paidsocial|ads?|display|cpm|cpv|sponsored|promoted|boost(ed)?)$/;
export const isPaidVisit = (r: { medium?: string | null; click?: string | null }) => Boolean((r.medium && PAID_MEDIUM.test(r.medium.toLowerCase())) || (r.click && CLICK_IDS[r.click]?.paid));

/** The platforms the company advertises on, always shown; others join the list once they bring someone. */
export const AD_PLATFORMS = ["instagram", "facebook", "tiktok", "x"] as const;
export const PLATFORM_NAMES: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", x: "X (Twitter)", google: "Google", youtube: "YouTube", linkedin: "LinkedIn", snapchat: "Snapchat", "audience-network": "Audience Network (Meta)", direct: "Direct" };
/** Each platform's own colour, so a dot on the live map or a row in a list is recognised at a glance. */
export const PLATFORM_COLORS: Record<string, string> = { instagram: "#e1306c", facebook: "#1877f2", tiktok: "#fe2c55", x: "var(--ink)", google: "#34a853", youtube: "#ff0000", linkedin: "#0a66c2", snapchat: "#f5c518", "audience-network": "#7b5cff", direct: "var(--muted)" };
export const platformColor = (source: string) => PLATFORM_COLORS[source] ?? "var(--bar-active)";

const KNOWN_REFERRERS = ["google", "instagram", "facebook", "x", "tiktok", "youtube", "linkedin", "bing", "yandex", "duckduckgo", "telegram", "whatsapp", "reddit", "pinterest"];
const SEARCH = new Set(["google", "bing", "yandex", "duckduckgo", "yahoo", "baidu", "ecosia", "brave"]);
const SOCIAL = new Set(["instagram", "facebook", "audience-network", "x", "tiktok", "youtube", "linkedin", "reddit", "pinterest", "threads", "snapchat"]);
const MESSAGING = new Set(["telegram", "whatsapp", "messenger", "viber", "signal"]);

/**
 * The kind of door a session came in through. Links people share on the site are doors of their own (a gift, a
 * partner's invitation, a company's link), then tagged links (a campaign), then search, social networks, messaging
 * apps, other sites, and direct.
 */
export type Channel = "gift" | "invite" | "company" | "campaign" | "search" | "social" | "messaging" | "referral" | "direct";
export const CHANNEL_NAMES: Record<Channel, string> = {
  gift: "Gift links", invite: "Partner invitations", company: "Company links", campaign: "Tagged links and ads",
  search: "Search engines", social: "Social networks", messaging: "Messaging apps", referral: "Other sites", direct: "Direct",
};
export function channelOf(r: { source: string | null; campaign?: string | null; medium?: string | null; path: string }): Channel {
  if (/^\/g\/\[id\]/.test(r.path)) return "gift";
  if (/^\/m\/\[id\]/.test(r.path)) return "invite";
  if (/^\/(r|s)\/\[id\]/.test(r.path) || r.path.startsWith("/w/")) return "company";
  const s = r.source ?? "direct";
  if (r.campaign || r.medium) return "campaign";
  if (s === "direct") return "direct";
  if (SEARCH.has(s)) return "search";
  if (SOCIAL.has(s)) return "social";
  if (MESSAGING.has(s)) return "messaging";
  // A referring site always has a dot in its name; a bare word came from a tagged link's utm_source.
  return s.includes(".") || KNOWN_REFERRERS.includes(s) ? "referral" : "campaign";
}

/** The referring page as host and path, for the statistics; nothing for our own pages, and only the host for the big sites. */
export function referrerPage(referrer: string | null | undefined, ownHosts: string[]): string | null {
  let url: URL;
  try { url = new URL(referrer ?? ""); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^(www|m|l|lm|mobile|out|away|amp)\./, "");
  if (!host) return null;
  const own = ownHosts.map((o) => o.toLowerCase().replace(/^www\./, "")).filter(Boolean);
  if (own.some((o) => host === o || host.endsWith(`.${o}`))) return null;
  const known = sourceOf(null, referrer, ownHosts);
  if (KNOWN_REFERRERS.includes(known)) return host;
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}`.slice(0, 160);
}

/** Phone, tablet or desktop: from the browser's own description, and failing that from the window width. */
export function deviceOf(userAgent: string | null | undefined, width: number | null | undefined): Device {
  const ua = userAgent ?? "";
  if (/iPad|Tablet|Silk|Kindle|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return "phone";
  if (width && width > 0) return width < 640 ? "phone" : width < 1024 ? "tablet" : "desktop";
  return "desktop";
}

export interface Period { views: number; visitors: number; sessions: number; accounts: number }
export interface Stats {
  today: Period; week: Period; month: Period; prevWeek: Period; prevMonth: Period;
  series: Array<{ day: string; views: number; visitors: number }>;
  pages: Array<{ path: string; views: number; visitors: number }>;
  /** Where sessions start, and how many of them end there (one page and gone). */
  landings: Array<{ path: string; sessions: number; bounce: number }>;
  /**
   * Where people come from. Sessions are counted where each one came from; visitors, sign-ups, recordings and
   * payments are counted by the visitor's FIRST session in the period, so each person is credited to one source.
   */
  sources: Array<{ source: string; channel: Channel; sessions: number; visitors: number; signups: number; recorded: number; free: number; paid: number }>;
  channels: Array<{ channel: Channel; sessions: number; visitors: number; signups: number; recorded: number; free: number; paid: number }>;
  /**
   * The ad platforms, each visitor credited to the platform of their first visit: from ads (paid) or not (organic),
   * and what they did after. The four advertised platforms are always listed.
   */
  platforms: Array<{ platform: string; sessions: number; visitors: number; paid: number; organic: number; signups: number; recorded: number; free: number; customers: number; campaigns: string[] }>;
  /** Tagged links: utm_campaign with its source and medium. */
  campaigns: Array<{ campaign: string; source: string; medium: string | null; sessions: number; visitors: number; signups: number }>;
  /** The pages on other sites that sent people here. */
  referrers: Array<{ referrer: string; sessions: number; visitors: number }>;
  countries: Array<{ country: string; visitors: number }>;
  /** Per device: visitors, sessions that opened the recorder, and of those the ones that reached a report. */
  devices: Array<{ device: Device; visitors: number; reached: number; finished: number }>;
  languages: Array<{ locale: string; visitors: number }>;
  sites: Array<{ site: Site; views: number; visitors: number }>;
  weekdays: Array<{ day: string; views: number }>;
  hours: Array<{ hour: number; views: number }>;
  /** Visitors of the last 30 days seen on two or more different days. */
  returning: { visitors: number; of: number };
  recording: { reached: number; finished: number };
  accounts: Array<{ userId: string; views: number; sessions: number; days: number; last: Date }>;
  /**
   * The landing page as the people who arrived on it used it, from ads and from everywhere else: sessions that began on
   * the main site's "/" since the follow-ups were kept. `seconds`: how many stayed under 3 s, 3–9, 10–29 and 30 or more.
   */
  engagement: Array<{ group: "ads" | "others"; sessions: number; stayed5: number; stayed15: number; scrolledHalf: number; tapped: number; movedOn: number; medianSeconds: number | null; seconds: [number, number, number, number] }>;
  /** What was tapped on the landing page by those sessions, most often first. */
  landingTaps: Array<{ label: string; count: number }>;
  /** Meta's placements (utm_term) for the sessions from Meta's platforms, with what those sessions did. */
  placements: Array<{ placement: string; sessions: number; stayed5: number; tapped: number; movedOn: number }>;
}

const isRecordPage = (r: VisitRow) => r.path === "/record" || (r.site === "partner" && (r.path === "/" || r.path === "/partners"));
const isReportPage = (r: VisitRow) => r.path === "/reports/[id]" || r.path === "/partners/r/[id]";
const uniq = <T>(list: T[], key: (x: T) => string) => new Set(list.map(key)).size;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export interface People { signedUp?: Set<string>; paid?: Set<string>; /** Accounts that opened their free first report in the period. */ free?: Set<string> }

/**
 * Everything the statistics page shows from the visits alone. `recordedUsers`: accounts that recorded in the period;
 * `people.signedUp` / `people.paid`: accounts created, and accounts that bought credits, in the period.
 */
export function summarize(rows: VisitRow[], now = new Date(), recordedUsers: Set<string> = new Set(), people: People = {}): Stats {
  const t = now.getTime();
  const between = (from: number, to: number) => rows.filter((r) => { const a = r.at.getTime(); return a >= from && a < to; });
  const period = (list: VisitRow[]): Period => ({ views: list.length, visitors: uniq(list, (r) => r.visitor), sessions: uniq(list, (r) => r.session), accounts: uniq(list.filter((r) => r.userId), (r) => r.userId!) });
  const month = between(t - 30 * DAY, Infinity);
  const startOfToday = new Date(new Date(t).setUTCHours(0, 0, 0, 0)).getTime();

  // Sessions: what they saw, where they started, whether they opened the recorder and then a report.
  const sessions = new Map<string, VisitRow[]>();
  for (const r of month) sessions.set(r.session, [...(sessions.get(r.session) ?? []), r]);
  const sessionInfo = [...sessions.values()].map((list) => {
    const sorted = [...list].sort((a, b) => a.at.getTime() - b.at.getTime());
    const first = sorted.find((r) => r.landing) ?? sorted[0];
    return { first, pages: uniq(sorted, (r) => r.path), reached: sorted.some(isRecordPage), finished: sorted.some(isRecordPage) && sorted.some(isReportPage), visitor: first.visitor, device: first.device, source: first.source ?? "direct", channel: channelOf(first) };
  });
  const visitorUsers = new Map<string, Set<string>>();
  for (const r of month) if (r.userId) visitorUsers.set(r.visitor, new Set([...(visitorUsers.get(r.visitor) ?? []), r.userId]));
  const isOneOf = (visitor: string, users: Set<string>) => [...(visitorUsers.get(visitor) ?? [])].some((u) => users.has(u));
  const recordedVisitor = (visitor: string) => isOneOf(visitor, recordedUsers);

  // Each visitor's first session in the period: the door they came in through, credited with whatever they did later.
  const firstSession = new Map<string, (typeof sessionInfo)[number]>();
  for (const s of [...sessionInfo].sort((a, b) => a.first.at.getTime() - b.first.at.getTime())) if (!firstSession.has(s.visitor)) firstSession.set(s.visitor, s);
  type Outcome = { visitors: Set<string>; signups: number; recorded: number; free: number; paid: number };
  const outcome = (): Outcome => ({ visitors: new Set(), signups: 0, recorded: 0, free: 0, paid: 0 });
  const credit = (o: Outcome, visitor: string) => { o.visitors.add(visitor); if (isOneOf(visitor, people.signedUp ?? new Set())) o.signups++; if (recordedVisitor(visitor)) o.recorded++; if (isOneOf(visitor, people.free ?? new Set())) o.free++; if (isOneOf(visitor, people.paid ?? new Set())) o.paid++; };

  const top = <K extends string>(items: Array<{ key: K; visitor: string }>, n: number) => {
    const by = new Map<K, Set<string>>();
    for (const i of items) by.set(i.key, (by.get(i.key) ?? new Set()).add(i.visitor));
    return [...by].map(([key, v]) => ({ key, visitors: v.size })).sort((a, b) => b.visitors - a.visitors).slice(0, n);
  };
  const pagesBy = new Map<string, { views: number; visitors: Set<string> }>();
  for (const r of month) { const p = pagesBy.get(r.path) ?? { views: 0, visitors: new Set() }; p.views++; p.visitors.add(r.visitor); pagesBy.set(r.path, p); }
  const landBy = new Map<string, { sessions: number; bounced: number }>();
  for (const s of sessionInfo) { const l = landBy.get(s.first.path) ?? { sessions: 0, bounced: 0 }; l.sessions++; if (s.pages === 1) l.bounced++; landBy.set(s.first.path, l); }
  const srcBy = new Map<string, { sessions: number; channels: Map<Channel, number> } & Outcome>();
  for (const s of sessionInfo) { const x = srcBy.get(s.source) ?? { sessions: 0, channels: new Map(), ...outcome() }; x.sessions++; x.channels.set(s.channel, (x.channels.get(s.channel) ?? 0) + 1); srcBy.set(s.source, x); }
  const chanBy = new Map<Channel, { sessions: number } & Outcome>();
  for (const s of sessionInfo) { const x = chanBy.get(s.channel) ?? { sessions: 0, ...outcome() }; x.sessions++; chanBy.set(s.channel, x); }
  const campBy = new Map<string, { campaign: string; source: string; medium: string | null; sessions: number; visitors: Set<string>; signups: number }>();
  for (const s of sessionInfo) {
    if (!s.first.campaign) continue;
    const key = `${s.first.campaign}|${s.source}|${s.first.medium ?? ""}`;
    const x = campBy.get(key) ?? { campaign: s.first.campaign, source: s.source, medium: s.first.medium ?? null, sessions: 0, visitors: new Set(), signups: 0 };
    x.sessions++; x.visitors.add(s.visitor); campBy.set(key, x);
  }
  const refBy = new Map<string, { sessions: number; visitors: Set<string> }>();
  for (const s of sessionInfo) { if (!s.first.referrer) continue; const x = refBy.get(s.first.referrer) ?? { sessions: 0, visitors: new Set() }; x.sessions++; x.visitors.add(s.visitor); refBy.set(s.first.referrer, x); }
  for (const [visitor, s] of firstSession) {
    credit(srcBy.get(s.source)!, visitor);
    credit(chanBy.get(s.channel)!, visitor);
    if (s.first.campaign) { const c = campBy.get(`${s.first.campaign}|${s.source}|${s.first.medium ?? ""}`); if (c && isOneOf(visitor, people.signedUp ?? new Set())) c.signups++; }
  }
  // The ad platforms: sessions where each came from; visitors, sign-ups, recordings and customers by first visit.
  const platBy = new Map<string, { sessions: number; visitors: number; paid: number; organic: number; signups: number; recorded: number; free: number; customers: number; campaigns: Map<string, number> }>();
  const plat = (key: string) => { const x = platBy.get(key) ?? { sessions: 0, visitors: 0, paid: 0, organic: 0, signups: 0, recorded: 0, free: 0, customers: 0, campaigns: new Map<string, number>() }; platBy.set(key, x); return x; };
  for (const key of AD_PLATFORMS) plat(key);
  const followed = new Set<string>([...AD_PLATFORMS, "audience-network", "google", "youtube", "linkedin", "snapchat"]);
  for (const s of sessionInfo) if (followed.has(s.source)) plat(s.source).sessions++;
  for (const [visitor, s] of firstSession) {
    if (!followed.has(s.source)) continue;
    const x = plat(s.source);
    x.visitors++;
    if (isPaidVisit(s.first)) x.paid++; else x.organic++;
    if (isOneOf(visitor, people.signedUp ?? new Set())) x.signups++;
    if (recordedVisitor(visitor)) x.recorded++;
    if (isOneOf(visitor, people.free ?? new Set())) x.free++;
    if (isOneOf(visitor, people.paid ?? new Set())) x.customers++;
    if (s.first.campaign) x.campaigns.set(s.first.campaign, (x.campaigns.get(s.first.campaign) ?? 0) + 1);
  }
  const devBy = new Map<Device, { visitors: Set<string>; reached: number; finished: number }>();
  for (const s of sessionInfo) { const x = devBy.get(s.device) ?? { visitors: new Set(), reached: 0, finished: 0 }; x.visitors.add(s.visitor); if (s.reached) x.reached++; if (s.finished) x.finished++; devBy.set(s.device, x); }
  const siteBy = new Map<Site, { views: number; visitors: Set<string> }>();
  for (const r of month) { const x = siteBy.get(r.site) ?? { views: 0, visitors: new Set() }; x.views++; x.visitors.add(r.visitor); siteBy.set(r.site, x); }

  // Busiest weekdays and hours, in New York time.
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short", hour: "numeric", hourCycle: "h23" });
  const weekdays = WEEKDAYS.map((day) => ({ day, views: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, views: 0 }));
  for (const r of month) {
    const parts = fmt.formatToParts(r.at);
    const wd = weekdays.find((w) => w.day === parts.find((p) => p.type === "weekday")?.value);
    if (wd) wd.views++;
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    if (h >= 0 && h < 24) hours[h].views++;
  }

  const daysBy = new Map<string, Set<string>>();
  for (const r of month) daysBy.set(r.visitor, (daysBy.get(r.visitor) ?? new Set()).add(dayOf(r.at)));
  const accBy = new Map<string, { views: number; sessions: Set<string>; days: Set<string>; last: Date }>();
  for (const r of month) {
    if (!r.userId) continue;
    const a = accBy.get(r.userId) ?? { views: 0, sessions: new Set(), days: new Set(), last: r.at };
    a.views++; a.sessions.add(r.session); a.days.add(dayOf(r.at)); if (r.at > a.last) a.last = r.at; accBy.set(r.userId, a);
  }

  const days = Array.from({ length: 30 }, (_, i) => dayOf(new Date(t - (29 - i) * DAY)));
  return {
    today: period(between(startOfToday, Infinity)),
    week: period(between(t - 7 * DAY, Infinity)), prevWeek: period(between(t - 14 * DAY, t - 7 * DAY)),
    month: period(month), prevMonth: period(between(t - 60 * DAY, t - 30 * DAY)),
    series: days.map((day) => { const list = month.filter((r) => dayOf(r.at) === day); return { day, views: list.length, visitors: uniq(list, (r) => r.visitor) }; }),
    pages: [...pagesBy].map(([path, p]) => ({ path, views: p.views, visitors: p.visitors.size })).sort((a, b) => b.views - a.views).slice(0, 10),
    landings: [...landBy].map(([path, l]) => ({ path, sessions: l.sessions, bounce: l.sessions ? l.bounced / l.sessions : 0 })).sort((a, b) => b.sessions - a.sessions).slice(0, 8),
    sources: [...srcBy].map(([source, x]) => ({ source, channel: [...x.channels].sort((a, b) => b[1] - a[1])[0][0], sessions: x.sessions, visitors: x.visitors.size, signups: x.signups, recorded: x.recorded, free: x.free, paid: x.paid })).sort((a, b) => b.sessions - a.sessions).slice(0, 12),
    platforms: [...platBy]
      .filter(([key, x]) => (AD_PLATFORMS as readonly string[]).includes(key) || x.sessions > 0)
      .map(([platform, x]) => ({ platform, sessions: x.sessions, visitors: x.visitors, paid: x.paid, organic: x.organic, signups: x.signups, recorded: x.recorded, free: x.free, customers: x.customers, campaigns: [...x.campaigns].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c) }))
      .sort((a, b) => b.visitors - a.visitors || AD_PLATFORMS.indexOf(a.platform as never) - AD_PLATFORMS.indexOf(b.platform as never)),
    channels: [...chanBy].map(([channel, x]) => ({ channel, sessions: x.sessions, visitors: x.visitors.size, signups: x.signups, recorded: x.recorded, free: x.free, paid: x.paid })).sort((a, b) => b.visitors - a.visitors || b.sessions - a.sessions),
    campaigns: [...campBy.values()].map((c) => ({ campaign: c.campaign, source: c.source, medium: c.medium, sessions: c.sessions, visitors: c.visitors.size, signups: c.signups })).sort((a, b) => b.sessions - a.sessions).slice(0, 10),
    referrers: [...refBy].map(([referrer, x]) => ({ referrer, sessions: x.sessions, visitors: x.visitors.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 8),
    countries: top(month.filter((r) => r.country).map((r) => ({ key: r.country!, visitor: r.visitor })), 8).map((c) => ({ country: c.key, visitors: c.visitors })),
    devices: [...devBy].map(([device, x]) => ({ device, visitors: x.visitors.size, reached: x.reached, finished: x.finished })).sort((a, b) => b.visitors - a.visitors),
    languages: top(month.filter((r) => r.locale).map((r) => ({ key: r.locale!, visitor: r.visitor })), 6).map((l) => ({ locale: l.key, visitors: l.visitors })),
    sites: [...siteBy].map(([site, x]) => ({ site, views: x.views, visitors: x.visitors.size })).sort((a, b) => b.views - a.views),
    weekdays,
    hours,
    returning: { visitors: [...daysBy.values()].filter((d) => d.size >= 2).length, of: daysBy.size },
    recording: { reached: sessionInfo.filter((s) => s.reached).length, finished: sessionInfo.filter((s) => s.finished).length },
    accounts: [...accBy].map(([userId, a]) => ({ userId, views: a.views, sessions: a.sessions.size, days: a.days.size, last: a.last })).sort((a, b) => b.views - a.views).slice(0, 10),
    ...landingUse(sessionInfo),
  };
}

/** The landing page as used by the sessions that began on it, what was tapped there, and Meta's placements. */
function landingUse(sessionInfo: Array<{ first: VisitRow; pages: number }>): Pick<Stats, "engagement" | "landingTaps" | "placements"> {
  const kept = (r: VisitRow) => typeof r.seenS === "number";
  const tapsOf = (r: VisitRow) => (r.taps ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  const landing = sessionInfo.filter((s) => s.first.site === "main" && s.first.path === "/" && kept(s.first));
  const engagement = (["ads", "others"] as const).map((group) => {
    const list = landing.filter((s) => isPaidVisit(s.first) === (group === "ads"));
    const secs = list.map((s) => s.first.seenS ?? 0).sort((a, b) => a - b);
    return {
      group, sessions: list.length,
      stayed5: list.filter((s) => (s.first.seenS ?? 0) >= 5).length,
      stayed15: list.filter((s) => (s.first.seenS ?? 0) >= 15).length,
      scrolledHalf: list.filter((s) => (s.first.scrollPct ?? 0) >= 50).length,
      tapped: list.filter((s) => tapsOf(s.first).length > 0).length,
      movedOn: list.filter((s) => s.pages > 1).length,
      medianSeconds: secs.length ? secs[Math.floor((secs.length - 1) / 2)] : null,
      seconds: [secs.filter((x) => x < 3).length, secs.filter((x) => x >= 3 && x < 10).length, secs.filter((x) => x >= 10 && x < 30).length, secs.filter((x) => x >= 30).length] as [number, number, number, number],
    };
  });
  const tapBy = new Map<string, number>();
  for (const s of landing) for (const tap of tapsOf(s.first)) tapBy.set(tap, (tapBy.get(tap) ?? 0) + 1);
  const placeBy = new Map<string, { sessions: number; stayed5: number; tapped: number; movedOn: number }>();
  for (const s of sessionInfo) {
    const term = s.first.term?.trim();
    if (!term || !["facebook", "instagram", "audience-network"].includes(s.first.source ?? "")) continue;
    const x = placeBy.get(term) ?? { sessions: 0, stayed5: 0, tapped: 0, movedOn: 0 };
    x.sessions++;
    if ((s.first.seenS ?? 0) >= 5) x.stayed5++;
    if (tapsOf(s.first).length) x.tapped++;
    if (s.pages > 1) x.movedOn++;
    placeBy.set(term, x);
  }
  return {
    engagement,
    landingTaps: [...tapBy].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    placements: [...placeBy].map(([placement, x]) => ({ placement, ...x })).sort((a, b) => b.sessions - a.sessions).slice(0, 12),
  };
}

export interface Extra { signups: number; prevSignups: number; recorded: number; /** New accounts that took the free first report, and how many of those paid. */ free?: number; freeThenPaid?: number; languageName?: (code: string) => string }

const pct = (a: number, b: number) => Math.round((a / b) * 100);
const hourLabel = (h: number) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`);
const sourceName = (s: string) => (s === "direct" ? "direct visits (typed address, saved link or an ad without a tracking link)" : s);

/** What stands out, in sentences: only claims the numbers can carry, so nothing is said on a handful of visits. */
export function insightsFor(s: Stats, x: Extra): string[] {
  const out: string[] = [];
  if (s.month.views === 0) return ["No visits recorded yet. Numbers appear as soon as people open the site."];
  const m = s.month, p = s.prevMonth;
  if (p.visitors >= 10) {
    const change = Math.round(((m.visitors - p.visitors) / p.visitors) * 100);
    if (Math.abs(change) >= 10) out.push(`Visitors are ${change > 0 ? "up" : "down"} ${Math.abs(change)}% on the previous 30 days (${m.visitors} vs ${p.visitors}).`);
    else out.push(`Visitors are steady: ${m.visitors} in the last 30 days, ${p.visitors} in the 30 before.`);
  }
  if (m.visitors >= 20) {
    const parts = [`Of ${m.visitors} visitors, ${x.signups} signed up (${pct(x.signups, m.visitors)}%)`];
    if (x.recorded > 0) parts.push(`${x.recorded} recorded (${pct(x.recorded, m.visitors)}%)`);
    out.push(parts.join(" and ") + ".");
    if (x.free !== undefined && x.signups >= 5 && x.free > 0) out.push(`${x.free} of the ${x.signups} new accounts took the free first report${x.freeThenPaid ? `, and ${x.freeThenPaid} of them went on to pay` : ""}.`);
    if (x.prevSignups >= 10) {
      const change = Math.round(((x.signups - x.prevSignups) / x.prevSignups) * 100);
      if (Math.abs(change) >= 15) out.push(`Sign-ups are ${change > 0 ? "up" : "down"} ${Math.abs(change)}% on the previous 30 days.`);
    }
  }
  if (m.sessions >= 20 && s.sources[0]) {
    const [first] = s.sources;
    out.push(`Most sessions start from ${sourceName(first.source)}: ${pct(first.sessions, m.sessions)}%.`);
    const rated = s.sources.filter((r) => r.visitors >= 20).map((r) => ({ ...r, rate: r.recorded / r.visitors })).sort((a, b) => b.rate - a.rate);
    if (rated.length >= 2 && rated[0].recorded >= 3 && rated[0].rate >= 2 * rated[1].rate) {
      const worst = rated.at(-1)!;
      out.push(`Visitors from ${rated[0].source} go on to record ${Math.round(rated[0].rate / Math.max(worst.rate, 0.005))}× as often as visitors from ${worst.source} (${pct(rated[0].recorded, rated[0].visitors)}% vs ${pct(worst.recorded, worst.visitors)}%).`);
    }
  }
  if (m.visitors >= 20) {
    const shared = s.channels.filter((c) => c.channel === "gift" || c.channel === "invite").reduce((n, c) => n + c.visitors, 0);
    if (shared / m.visitors >= 0.1) out.push(`${pct(shared, m.visitors)}% of visitors arrived through a link someone shared with them: a gift or a partner's invitation.`);
  }
  if (s.recording.reached >= 20) {
    const phone = s.devices.find((d) => d.device === "phone"), desk = s.devices.find((d) => d.device === "desktop");
    if (phone && desk && phone.reached >= 15 && desk.reached >= 15 && desk.finished / desk.reached >= 1.5 * (phone.finished / phone.reached)) {
      out.push(`On phones, ${pct(phone.finished, phone.reached)}% of people who open the recorder reach a report; on desktop ${pct(desk.finished, desk.reached)}%. Phone recording is where people drop off.`);
    } else {
      out.push(`${pct(s.recording.finished, s.recording.reached)}% of people who open the recorder go on to a report.`);
    }
  }
  if (m.visitors >= 20) {
    const share = pct(s.returning.visitors, s.returning.of);
    out.push(share < 10 ? `Almost nobody comes back yet: ${share}% of visitors returned on another day.` : `${share}% of visitors came back on another day.`);
  }
  const land = s.landings.find((l) => l.sessions >= 20 && l.bounce >= 0.6);
  if (land) out.push(`${Math.round(land.bounce * 100)}% of people landing on ${land.path} leave after that one page.`);
  if (m.views >= 50) {
    const day = [...s.weekdays].sort((a, b) => b.views - a.views)[0];
    const hour = [...s.hours].sort((a, b) => b.views - a.views)[0];
    if (day && hour && day.views > 0) out.push(`Busiest: ${day.day}, around ${hourLabel(hour.hour)} New York time.`);
  }
  if (m.visitors >= 20) {
    const lang = s.languages.find((l) => l.locale !== "en" && l.visitors / m.visitors >= 0.1);
    if (lang) out.push(`${pct(lang.visitors, m.visitors)}% of visitors read the site in ${x.languageName?.(lang.locale) ?? lang.locale}.`);
  }
  if (out.length === 0) out.push(`${m.visitors} visitors and ${m.views} page views in 30 days. Comparisons appear once there are more.`);
  return out;
}

// ---------- live traffic (components/LiveTraffic.tsx, app/api/admin/live) ----------

export interface LiveRow {
  at: Date; path: string; visitor: string; session: string; landing: boolean; source: string | null; device: Device; userId?: string | null;
  medium?: string | null; click?: string | null; campaign?: string | null; content?: string | null; referrer?: string | null; locale?: string | null;
  country: string | null; city?: string | null; region?: string | null; lat?: number | null; lon?: number | null;
}
/** One visitor of the last hour, for the live map: where they are, where they came from, and what they have looked at. */
export interface LiveVisitor {
  /** A short stand-in for the visitor's id. */
  key: string;
  lat: number | null; lon: number | null; city: string | null; region: string | null; country: string | null;
  /** Seen in the last 5 minutes. */
  active: boolean;
  firstAt: number; lastAt: number;
  source: string; paid: boolean; campaign: string | null; content: string | null; referrer: string | null;
  device: Device; locale: string | null;
  /** The page their latest visit started on, and the page they are on now. */
  landing: string; current: string;
  /** This hour's pages, oldest first (at most 12). */
  pages: Array<{ path: string; at: number }>;
  userId: string | null;
  /** Just a visitor, signed up (the browser has an account), or paid (that account bought credits within this hour). */
  status: "visitor" | "signed-up" | "free" | "paid";
  /** Filled in by the API: when the purchase or the free first report of this hour landed, and the account's history. */
  paidAt?: number | null; customer?: boolean; freeAt?: number | null; hadFree?: boolean;
  /** Filled in by the API: the account's name, and whether the browser was here on an earlier day. */
  account?: string | null; returning?: boolean; sessions30?: number;
}
export interface Live {
  now: number;
  /** Visitors seen in the last 5 minutes. */
  active: number;
  views30: number;
  visitors30: number;
  /** Visitors per minute over the last hour, oldest first. */
  perMinute: number[];
  /** The last 30 minutes by where each visitor came from. */
  sources: Array<{ source: string; visitors: number; paid: number }>;
  /** Where the visitors of the last 5 minutes are now: each one's latest page. */
  pages: Array<{ path: string; visitors: number }>;
  /** Everyone on the map's span (the last hour unless asked for more), most recent first, at most `maxVisitors`. */
  visitors: LiveVisitor[];
  /** The map's span in minutes, and how many visitors it held before the cap. */
  spanMin: number;
  mapTotal: number;
  /** The latest page views, newest first; `key` is the visitor's, so a row can point at them on the map. */
  feed: Array<{ key: string; at: number; path: string; source: string; paid: boolean; city: string | null; country: string | null; device: Device; landing: boolean; signedIn: boolean }>;
}

const MIN = 60_000;
/** The short, safe stand-in for a visitor's cookie id, used on the live map and as PostHog's distinct id. */
export const shortKey = (visitor: string) => visitor.replace(/[^a-z0-9]/gi, "").slice(0, 10);

/** The live view from the last hour of visits. `history`: each visitor's first visit and number of visits in 30 days. */
/**
 * The live view. The numbers (active now, the last 30 minutes, visitors per minute, the feed) are always the last hour;
 * the visitors for the map cover `spanMin` minutes (rows must reach that far back), the most recent `maxVisitors` of them.
 */
export function liveSummary(rows: LiveRow[], now = new Date(), history: Map<string, { first: Date; sessions: number; userId?: string | null }> = new Map(), { spanMin = 60, maxVisitors = 3000 }: { spanMin?: number; maxVisitors?: number } = {}): Live {
  const t = now.getTime();
  const onMapRows = rows.filter((r) => r.at.getTime() > t - spanMin * MIN && r.at.getTime() <= t + MIN).sort((a, b) => b.at.getTime() - a.at.getTime());
  const recent = rows.filter((r) => r.at.getTime() > t - 60 * MIN && r.at.getTime() <= t + MIN).sort((a, b) => b.at.getTime() - a.at.getTime());
  const last30 = recent.filter((r) => r.at.getTime() > t - 30 * MIN);
  const last5 = recent.filter((r) => r.at.getTime() > t - 5 * MIN);
  const latestOf = (list: LiveRow[]) => { const m = new Map<string, LiveRow>(); for (const r of list) if (!m.has(r.visitor)) m.set(r.visitor, r); return [...m.values()]; };
  const perMinute = Array.from({ length: 60 }, (_, i) => {
    const from = t - (60 - i) * MIN, to = from + MIN;
    return new Set(recent.filter((r) => r.at.getTime() > from && r.at.getTime() <= to).map((r) => r.visitor)).size;
  });
  const bySource = new Map<string, { visitors: number; paid: number }>();
  for (const r of latestOf(last30)) {
    const x = bySource.get(r.source ?? "direct") ?? { visitors: 0, paid: 0 };
    x.visitors++; if (isPaidVisit(r)) x.paid++;
    bySource.set(r.source ?? "direct", x);
  }
  const byPage = new Map<string, number>();
  for (const r of latestOf(last5)) byPage.set(r.path, (byPage.get(r.path) ?? 0) + 1);
  const activeVisitors = new Set(last5.map((r) => r.visitor));

  const byVisitor = new Map<string, LiveRow[]>();
  for (const r of onMapRows) { const list = byVisitor.get(r.visitor); if (list) list.push(r); else byVisitor.set(r.visitor, [r]); }
  const visitors: LiveVisitor[] = [...byVisitor].slice(0, maxVisitors).map(([visitor, list]) => {
    const asc = [...list].reverse();
    const latest = list[0];
    const session = asc.filter((r) => r.session === latest.session);
    const pages: Array<{ path: string; at: number }> = [];
    for (const r of asc) if (pages.at(-1)?.path !== r.path) pages.push({ path: r.path, at: r.at.getTime() });
    const placed = list.find((r) => typeof r.lat === "number" && typeof r.lon === "number");
    const h = history.get(visitor);
    return {
      key: shortKey(visitor),
      lat: placed?.lat ?? null, lon: placed?.lon ?? null, city: (placed ?? latest).city ?? null, region: (placed ?? latest).region ?? null, country: latest.country,
      active: activeVisitors.has(visitor),
      firstAt: asc[0].at.getTime(), lastAt: latest.at.getTime(),
      source: latest.source ?? "direct", paid: isPaidVisit(latest), campaign: latest.campaign ?? null, content: latest.content ?? null, referrer: latest.referrer ?? null,
      device: latest.device, locale: latest.locale ?? null,
      landing: (session.find((r) => r.landing) ?? session[0]).path, current: latest.path,
      pages: pages.slice(-12),
      userId: list.find((r) => r.userId)?.userId ?? h?.userId ?? null,
      status: (list.find((r) => r.userId)?.userId ?? h?.userId) ? "signed-up" : "visitor",
      ...(h ? { returning: h.first.getTime() < asc[0].at.getTime() - 30 * MIN || h.sessions > 1, sessions30: h.sessions } : {}),
    };
  });
  return {
    now: t,
    active: activeVisitors.size,
    views30: last30.length,
    visitors30: new Set(last30.map((r) => r.visitor)).size,
    perMinute,
    spanMin,
    mapTotal: byVisitor.size,
    sources: [...bySource].map(([source, x]) => ({ source, ...x })).sort((a, b) => b.visitors - a.visitors).slice(0, 8),
    pages: [...byPage].map(([path, visitors]) => ({ path, visitors })).sort((a, b) => b.visitors - a.visitors).slice(0, 6),
    visitors,
    feed: recent.slice(0, 20).map((r) => ({ key: shortKey(r.visitor), at: r.at.getTime(), path: r.path, source: r.source ?? "direct", paid: isPaidVisit(r), city: r.city ?? null, country: r.country, device: r.device, landing: r.landing, signedIn: Boolean(r.userId) })),
  };
}
