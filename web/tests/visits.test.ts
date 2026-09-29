import { describe, expect, it } from "vitest";
import { channelOf, deviceOf, insightsFor, isPaidVisit, liveSummary, normalizePath, referrerPage, sourceOf, summarize, type VisitRow } from "@/lib/visits-math";

const NOW = new Date("2026-09-27T15:00:00Z");
const H = 3_600_000, D = 24 * H;
const row = (o: Partial<VisitRow> & { at: Date }): VisitRow => ({ site: "main", path: "/", visitor: "v1", session: "s1", userId: null, landing: false, source: "direct", country: "US", device: "desktop", locale: "en", ...o });

describe("visit maths", () => {
  it("takes ids out of paths", () => {
    expect(normalizePath("/reports/1d1b894c-fed7-4d47-8c14-a6c8dbccbe48?industry=it#industry")).toBe("/reports/[id]");
    expect(normalizePath("/m/Ab3dEf7hIj9kLm1nOp")).toBe("/m/[id]");
    expect(normalizePath("/partners/r/abc123def456ghi7")).toBe("/partners/r/[id]");
    expect(normalizePath("/sign-in/factor-one")).toBe("/sign-in/factor-one");
    expect(normalizePath("/reports/")).toBe("/reports");
    expect(normalizePath("reports")).toBe("/");
  });

  it("names the source", () => {
    const own = ["www.avocousa.us", "avoco-partners.vercel.app"];
    expect(sourceOf("IG_Story", "https://l.instagram.com/", own)).toBe("instagram"); // spellings of one platform fold into it
    expect(sourceOf(null, "https://l.instagram.com/?u=x", own)).toBe("instagram");
    expect(sourceOf(null, "https://www.google.co.uk/", own)).toBe("google");
    expect(sourceOf(null, "https://t.co/abc", own)).toBe("x");
    expect(sourceOf(null, "https://accounts.avocousa.us/sign-in", own)).toBe("direct");
    expect(sourceOf(null, "", own)).toBe("direct");
    expect(sourceOf(null, "not a url", own)).toBe("direct");
    expect(sourceOf(null, "https://blog.example.org/post", own)).toBe("blog.example.org");
  });

  it("names the door a session came in through", () => {
    const at = (o: { source: string | null; campaign?: string | null; medium?: string | null; path?: string }) => channelOf({ path: "/", ...o });
    expect(at({ source: "google" })).toBe("search");
    expect(at({ source: "instagram" })).toBe("social");
    expect(at({ source: "whatsapp" })).toBe("messaging");
    expect(at({ source: "direct" })).toBe("direct");
    expect(at({ source: null })).toBe("direct");
    expect(at({ source: "blog.example.org" })).toBe("referral");
    expect(at({ source: "instagram", campaign: "launch" })).toBe("campaign");
    expect(at({ source: "ig_story" })).toBe("campaign"); // a bare word only comes from a tagged link
    expect(at({ source: "google", path: "/g/[id]" })).toBe("gift");
    expect(at({ source: "direct", path: "/m/[id]" })).toBe("invite");
    expect(at({ source: "direct", path: "/r/[id]" })).toBe("company");
    expect(at({ source: "direct", path: "/w/acme/g/sales" })).toBe("company");
  });

  it("keeps the referring page, but only the host of the big sites and nothing of our own", () => {
    const own = ["www.avocousa.us"];
    expect(referrerPage("https://blog.example.org/posts/voice-tests/?ref=x", own)).toBe("blog.example.org/posts/voice-tests");
    expect(referrerPage("https://www.google.com/search?q=avoco", own)).toBe("google.com");
    expect(referrerPage("https://www.avocousa.us/reports", own)).toBeNull();
    expect(referrerPage("", own)).toBeNull();
    expect(referrerPage(null, own)).toBeNull();
  });

  it("tells phones, tablets and desktops apart", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", 390)).toBe("phone");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit Safari", 1200)).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari", 412)).toBe("phone");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari", 820)).toBe("tablet"); // an iPad that calls itself a Mac
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0) Chrome", 1600)).toBe("desktop");
    expect(deviceOf(null, null)).toBe("desktop");
  });

  it("summarises visitors, sessions, sources, the recorder funnel and returns", () => {
    const rows: VisitRow[] = [
      // Anna: two sessions on two days from instagram, phone; recorded with her account
      row({ at: new Date(NOW.getTime() - 2 * D), visitor: "anna", session: "a1", landing: true, source: "instagram", device: "phone" }),
      row({ at: new Date(NOW.getTime() - 2 * D + H), visitor: "anna", session: "a1", path: "/record", source: "instagram", device: "phone", userId: "user_anna" }),
      row({ at: new Date(NOW.getTime() - 2 * D + 2 * H), visitor: "anna", session: "a1", path: "/reports/[id]", source: "instagram", device: "phone", userId: "user_anna" }),
      row({ at: new Date(NOW.getTime() - 1 * D), visitor: "anna", session: "a2", landing: true, path: "/reports", source: "direct", device: "phone", userId: "user_anna" }),
      // Ben: one page from google and gone
      row({ at: new Date(NOW.getTime() - 3 * D), visitor: "ben", session: "b1", landing: true, source: "google", locale: "es" }),
      // Cid: opened the recorder on desktop, never reached a report
      row({ at: new Date(NOW.getTime() - 5 * H), visitor: "cid", session: "c1", landing: true, source: "google" }),
      row({ at: new Date(NOW.getTime() - 4 * H), visitor: "cid", session: "c1", path: "/record", source: "google" }),
      // an old visit, before the period
      row({ at: new Date(NOW.getTime() - 45 * D), visitor: "old", session: "o1", landing: true }),
    ];
    const s = summarize(rows, NOW, new Set(["user_anna"]));
    expect(s.month).toEqual({ views: 7, visitors: 3, sessions: 4, accounts: 1 });
    expect(s.prevMonth.visitors).toBe(1);
    expect(s.today.visitors).toBe(1);
    expect(s.series).toHaveLength(30);
    expect(s.series.at(-1)).toEqual({ day: "2026-09-27", views: 2, visitors: 1 });
    // Anna came from instagram first, so she, her recording and her later direct visit are credited to instagram.
    expect(s.sources.map((r) => [r.source, r.channel, r.sessions, r.visitors, r.recorded])).toEqual([["google", "search", 2, 2, 0], ["instagram", "social", 1, 1, 1], ["direct", "direct", 1, 0, 0]]);
    expect(s.channels.map((c) => [c.channel, c.visitors, c.recorded])).toEqual([["search", 2, 0], ["social", 1, 1], ["direct", 0, 0]]);
    expect(s.landings.find((l) => l.path === "/")).toEqual({ path: "/", sessions: 3, bounce: 1 / 3 });
    expect(s.recording).toEqual({ reached: 2, finished: 1 });
    expect(s.devices.find((d) => d.device === "phone")).toEqual({ device: "phone", visitors: 1, reached: 1, finished: 1 });
    expect(s.returning).toEqual({ visitors: 1, of: 3 });
    expect(s.languages).toEqual([{ locale: "en", visitors: 2 }, { locale: "es", visitors: 1 }]);
    expect(s.accounts).toEqual([{ userId: "user_anna", views: 3, sessions: 2, days: 2, last: new Date(NOW.getTime() - 1 * D) }]);
    expect(s.weekdays.reduce((n, w) => n + w.views, 0)).toBe(7);
    expect(s.hours.reduce((n, h) => n + h.views, 0)).toBe(7);
  });

  it("credits sign-ups and payments to the first door, and lists tagged links and referring pages", () => {
    const rows: VisitRow[] = [
      row({ at: new Date(NOW.getTime() - 3 * D), visitor: "dee", session: "d1", landing: true, source: "instagram", campaign: "launch", medium: "bio" }),
      row({ at: new Date(NOW.getTime() - 2 * D), visitor: "dee", session: "d2", landing: true, source: "google", userId: "user_dee" }),
      row({ at: new Date(NOW.getTime() - 1 * D), visitor: "eve", session: "e1", landing: true, source: "blog.example.org", referrer: "blog.example.org/post", userId: "user_eve" }),
      row({ at: new Date(NOW.getTime() - 1 * D), visitor: "fay", session: "f1", landing: true, path: "/g/[id]", source: "direct" }),
    ];
    const s = summarize(rows, NOW, new Set(["user_eve"]), { signedUp: new Set(["user_dee", "user_eve"]), paid: new Set(["user_dee"]) });
    expect(s.sources.find((x) => x.source === "instagram")).toEqual({ source: "instagram", channel: "campaign", sessions: 1, visitors: 1, signups: 1, recorded: 0, paid: 1 });
    expect(s.sources.find((x) => x.source === "google")).toEqual({ source: "google", channel: "search", sessions: 1, visitors: 0, signups: 0, recorded: 0, paid: 0 });
    expect(s.channels.find((c) => c.channel === "gift")).toEqual({ channel: "gift", sessions: 1, visitors: 1, signups: 0, recorded: 0, paid: 0 });
    expect(s.channels.find((c) => c.channel === "referral")).toEqual({ channel: "referral", sessions: 1, visitors: 1, signups: 1, recorded: 1, paid: 0 });
    expect(s.campaigns).toEqual([{ campaign: "launch", source: "instagram", medium: "bio", sessions: 1, visitors: 1, signups: 1 }]);
    expect(s.referrers).toEqual([{ referrer: "blog.example.org/post", sessions: 1, visitors: 1 }]);
  });

  it("counts the partner page's own front page as its recorder", () => {
    const rows = [row({ at: NOW, site: "partner", path: "/", landing: true }), row({ at: NOW, site: "partner", path: "/partners/r/[id]" })];
    expect(summarize(rows, NOW).recording).toEqual({ reached: 1, finished: 1 });
  });

  it("says only what the numbers can carry", () => {
    expect(insightsFor(summarize([], NOW), { signups: 0, prevSignups: 0, recorded: 0 })).toEqual(["No visits recorded yet. Numbers appear as soon as people open the site."]);
    const few = summarize([row({ at: NOW, landing: true })], NOW);
    expect(insightsFor(few, { signups: 0, prevSignups: 0, recorded: 0 })).toEqual(["1 visitors and 1 page views in 30 days. Comparisons appear once there are more."]);
    // Sixty visitors this month from instagram, thirty the month before: a trend, a top source, a return rate.
    const many: VisitRow[] = [];
    for (let i = 0; i < 60; i++) many.push(row({ at: new Date(NOW.getTime() - (i % 20) * D - H), visitor: `v${i}`, session: `s${i}`, landing: true, source: i % 3 ? "instagram" : "google", device: "phone" }));
    for (let i = 0; i < 30; i++) many.push(row({ at: new Date(NOW.getTime() - 40 * D - i * H), visitor: `p${i}`, session: `q${i}`, landing: true }));
    const lines = insightsFor(summarize(many, NOW), { signups: 6, prevSignups: 2, recorded: 3 });
    expect(lines[0]).toBe("Visitors are up 100% on the previous 30 days (60 vs 30).");
    expect(lines).toContain("Of 60 visitors, 6 signed up (10%) and 3 recorded (5%).");
    expect(lines).toContain("Most sessions start from instagram: 67%.");
    expect(lines).toContain("Almost nobody comes back yet: 0% of visitors returned on another day.");
    expect(lines.some((l) => l.startsWith("Busiest: "))).toBe(true);
  });
});

describe("ad platforms", () => {
  const own = ["www.avocousa.us"];
  const IG_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 305.0.0.0";
  const FB_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]";
  const TT_APP = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6";

  it("folds utm spellings, Meta's placeholders included, into one platform", () => {
    for (const [utm, platform] of [["ig", "instagram"], ["Instagram", "instagram"], ["fb", "facebook"], ["meta", "facebook"], ["an", "facebook"], ["tw", "x"], ["twitter", "x"], ["x", "x"], ["tt", "tiktok"], ["tiktok_ads", "tiktok"], ["newsletter", "newsletter"], ["xmas", "xmas"]]) {
      expect(sourceOf(utm, null, own)).toBe(platform);
    }
  });

  it("recognises ad click ids and the apps' own browsers when there is no tag", () => {
    expect(sourceOf(null, null, own, { click: "ttclid" })).toBe("tiktok");
    expect(sourceOf(null, null, own, { click: "twclid" })).toBe("x");
    expect(sourceOf(null, null, own, { click: "gclid" })).toBe("google");
    expect(sourceOf(null, null, own, { click: "fbclid", userAgent: IG_APP })).toBe("instagram");
    expect(sourceOf(null, null, own, { click: "fbclid", userAgent: FB_APP })).toBe("facebook");
    expect(sourceOf(null, "", own, { userAgent: TT_APP })).toBe("tiktok");
    expect(sourceOf(null, "", own, { userAgent: IG_APP })).toBe("instagram");
    expect(sourceOf(null, "https://www.google.com/", own, { userAgent: IG_APP })).toBe("google"); // a referrer outranks the app
    expect(sourceOf("newsletter", null, own, { click: "ttclid" })).toBe("newsletter"); // a tag outranks everything
    expect(sourceOf(null, "", own, { userAgent: "Mozilla/5.0 (Macintosh) Safari" })).toBe("direct");
  });

  it("tells ads from organic visits", () => {
    expect(isPaidVisit({ medium: "paid" })).toBe(true);
    expect(isPaidVisit({ medium: "CPC" })).toBe(true);
    expect(isPaidVisit({ medium: "paid_social" })).toBe(true);
    expect(isPaidVisit({ medium: "social" })).toBe(false);
    expect(isPaidVisit({ click: "ttclid" })).toBe(true);
    expect(isPaidVisit({ click: "fbclid" })).toBe(false); // Meta adds it to every link
    expect(isPaidVisit({})).toBe(false);
  });

  it("lists the four advertised platforms always, with ads and organic apart and what their visitors did", () => {
    const rows: VisitRow[] = [
      row({ at: new Date(NOW.getTime() - 3 * H), visitor: "a", session: "a1", landing: true, source: "tiktok", medium: "paid", campaign: "launch" }),
      row({ at: new Date(NOW.getTime() - 3 * H + 60_000), visitor: "a", session: "a1", path: "/record", source: "tiktok", medium: "paid", userId: "user_a" }),
      row({ at: new Date(NOW.getTime() - 2 * H), visitor: "b", session: "b1", landing: true, source: "tiktok" }),
      row({ at: new Date(NOW.getTime() - 5 * H), visitor: "c", session: "c1", landing: true, source: "instagram", click: "fbclid" }),
      row({ at: new Date(NOW.getTime() - 1 * H), visitor: "c", session: "c2", landing: true, source: "tiktok", medium: "paid" }), // came back from TikTok: still Instagram's
    ];
    const s = summarize(rows, NOW, new Set(["user_a"]), { signedUp: new Set(["user_a"]), paid: new Set(["user_a"]) });
    expect(s.platforms.map((p) => p.platform)).toEqual(["tiktok", "instagram", "facebook", "x"]);
    expect(s.platforms[0]).toMatchObject({ platform: "tiktok", sessions: 3, visitors: 2, paid: 1, organic: 1, signups: 1, recorded: 1, customers: 1, campaigns: ["launch"] });
    expect(s.platforms[1]).toMatchObject({ platform: "instagram", visitors: 1, paid: 0, organic: 1 });
    expect(s.platforms[3]).toMatchObject({ platform: "x", visitors: 0, sessions: 0 });
  });
});

describe("live traffic", () => {
  it("counts who is on now, per minute, where from and where on the map", () => {
    const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000);
    const live = liveSummary([
      { at: at(1), path: "/record", visitor: "a", session: "a1", landing: false, source: "tiktok", medium: "paid", device: "phone", country: "US", city: "Miami", lat: 26, lon: -80, userId: "user_a" },
      { at: at(3), path: "/", visitor: "a", session: "a1", landing: true, source: "tiktok", medium: "paid", device: "phone", country: "US", city: "Miami", lat: 26, lon: -80 },
      { at: at(12), path: "/", visitor: "b", session: "b1", landing: true, source: "instagram", device: "desktop", country: "DE", city: "Berlin", lat: 53, lon: 13 },
      { at: at(45), path: "/", visitor: "c", session: "c1", landing: true, source: "direct", device: "desktop", country: "GB", city: null, lat: null, lon: null },
      { at: at(90), path: "/", visitor: "old", session: "o1", landing: true, source: "x", device: "phone", country: "US" },
    ], NOW);
    expect(live.active).toBe(1);
    expect(live.visitors30).toBe(2);
    expect(live.views30).toBe(3);
    expect(live.perMinute).toHaveLength(60);
    expect(live.perMinute.reduce((n, v) => n + v, 0)).toBe(4);
    expect(live.sources).toEqual([{ source: "tiktok", visitors: 1, paid: 1 }, { source: "instagram", visitors: 1, paid: 0 }]);
    expect(live.pages).toEqual([{ path: "/record", visitors: 1 }]);
    expect(live.visitors.map((v) => [v.city, v.active, v.source])).toEqual([["Miami", true, "tiktok"], ["Berlin", false, "instagram"], [null, false, "direct"]]);
    const a = live.visitors[0];
    expect(a).toMatchObject({ lat: 26, lon: -80, country: "US", paid: true, landing: "/", current: "/record", device: "phone", userId: "user_a" });
    expect(a.pages.map((p) => p.path)).toEqual(["/", "/record"]);
    expect(a.lastAt - a.firstAt).toBe(2 * 60_000);
    expect(live.visitors[2]).toMatchObject({ lat: null, lon: null }); // no position: counted, not placed
    expect(live.feed[0].key).toBe(a.key);
    expect(live.feed.map((f) => f.path)).toEqual(["/record", "/", "/", "/"]);
    // a visitor's month: returning when this browser came on an earlier day
    const again = liveSummary([{ at: at(2), path: "/", visitor: "a", session: "a9", landing: true, source: "direct", device: "phone", country: "US" }], NOW, new Map([["a", { first: at(60 * 24 * 3), sessions: 4 }]]));
    expect(again.visitors[0]).toMatchObject({ returning: true, sessions30: 4 });
    expect(live.feed[0]).toMatchObject({ source: "tiktok", paid: true, signedIn: true, city: "Miami" });
  });
});
