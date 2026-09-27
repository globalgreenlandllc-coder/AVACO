import { describe, expect, it } from "vitest";
import { deviceOf, insightsFor, normalizePath, sourceOf, summarize, type VisitRow } from "@/lib/visits-math";

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
    expect(sourceOf("IG_Story", "https://l.instagram.com/", own)).toBe("ig_story");
    expect(sourceOf(null, "https://l.instagram.com/?u=x", own)).toBe("instagram");
    expect(sourceOf(null, "https://www.google.co.uk/", own)).toBe("google");
    expect(sourceOf(null, "https://t.co/abc", own)).toBe("x");
    expect(sourceOf(null, "https://accounts.avocousa.us/sign-in", own)).toBe("direct");
    expect(sourceOf(null, "", own)).toBe("direct");
    expect(sourceOf(null, "not a url", own)).toBe("direct");
    expect(sourceOf(null, "https://blog.example.org/post", own)).toBe("blog.example.org");
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
    expect(s.sources.map((r) => [r.source, r.sessions, r.visitors, r.recorded])).toEqual([["google", 2, 2, 0], ["instagram", 1, 1, 1], ["direct", 1, 1, 1]]);
    expect(s.landings.find((l) => l.path === "/")).toEqual({ path: "/", sessions: 3, bounce: 1 / 3 });
    expect(s.recording).toEqual({ reached: 2, finished: 1 });
    expect(s.devices.find((d) => d.device === "phone")).toEqual({ device: "phone", visitors: 1, reached: 1, finished: 1 });
    expect(s.returning).toEqual({ visitors: 1, of: 3 });
    expect(s.languages).toEqual([{ locale: "en", visitors: 2 }, { locale: "es", visitors: 1 }]);
    expect(s.accounts).toEqual([{ userId: "user_anna", views: 3, sessions: 2, days: 2, last: new Date(NOW.getTime() - 1 * D) }]);
    expect(s.weekdays.reduce((n, w) => n + w.views, 0)).toBe(7);
    expect(s.hours.reduce((n, h) => n + h.views, 0)).toBe(7);
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
