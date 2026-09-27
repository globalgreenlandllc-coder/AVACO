import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ isAdminUser: async (userId: string) => userId === "user_boss" }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";
import { bestCredits, saveBestPricing, startBestPurchase } from "@/lib/best-billing";
import { en } from "@/lib/i18n/en";
import { INDUSTRIES, INDUSTRY_KEYS, industryDemand, industryFit, industryMatches, LEVELS, SECTOR_KEYS, SECTORS } from "@/lib/industries";
import { bestIndustry, industryNames } from "@/lib/industry-chapter";

const TYPES = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"] as const;
/** A profile the way AVOCO scores one: a leader, a runner-up at 45, the rest low. */
const profile = (leader: string, value: number, second: string) => TYPES.map((key) => ({ key, value: key === leader ? value : key === second ? 45 : 15 }));

describe("the industry catalogue", () => {
  it("puts every industry in exactly one sector, church, care and coaching among them", () => {
    const listed = SECTOR_KEYS.flatMap((s) => [...SECTORS[s]]);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...INDUSTRY_KEYS].sort());
    for (const key of ["church", "care", "coaching"]) expect(INDUSTRY_KEYS).toContain(key);
    expect(industryNames(en).find((i) => i.key === "church")).toMatchObject({ name: "Church and ministry", sector: "people" });
  });

  it("gives every new industry a role at every career level, and a name and a line to each role", () => {
    for (const key of ["church", "care", "coaching"] as const) {
      const roles = Object.values(INDUSTRIES[key]);
      for (const level of LEVELS) expect(roles.some((r) => r.level === level)).toBe(true);
      for (const role of Object.keys(INDUSTRIES[key])) expect(en.content.industries[key].roles[role]?.text).toBeTruthy();
    }
  });
});

describe("the best-industry finder", () => {
  it("scores each industry as half its best role, three tenths its top three roles and a fifth its fit with the types", () => {
    const types = profile("mediator", 80, "harmonizer");
    const all = industryMatches(types)!;
    expect(all).toHaveLength(INDUSTRY_KEYS.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1].match).toBeGreaterThanOrEqual(all[i].match);

    const church = all.find((m) => m.industry === "church")!;
    const fit = industryFit("church", types)!;
    const demand = industryDemand("church");
    const typeFit = Object.entries(demand).reduce((s, [k, share]) => s + share! * types.find((t) => t.key === k)!.value, 0);
    expect(church.peak).toBe(fit.roles[0].score);
    expect(church.depth).toBe(fit.overall);
    expect(church.typeFit).toBeCloseTo(typeFit, 1);
    expect(church.match).toBeCloseTo(0.5 * church.peak + 0.3 * church.depth + 0.2 * church.typeFit, 1);
  });

  it("finds a caring, meaning-driven voice a people industry, and a commanding one a leader's industry", () => {
    const warm = industryMatches(profile("mediator", 80, "harmonizer"))![0];
    expect(SECTORS.people as readonly string[]).toContain(warm.industry);
    const boss = industryMatches(profile("driver", 85, "organizer"))![0];
    expect(boss.best.level).toBe("lead");
  });

  it("explains the winner, its best role and the path to it, with the next four as alternatives", () => {
    const r = bestIndustry(profile("performer", 78, "catalyst"), en, "en")!;
    const top = industryMatches(profile("performer", 78, "catalyst"))![0];
    expect(r.total).toBe(INDUSTRY_KEYS.length);
    expect(r.industry).toBe(top.industry);
    expect(r.eyebrow).toContain(String(INDUSTRY_KEYS.length));
    expect(r.why).toContain(r.name);
    expect(r.role.score).toBe(top.peak);
    expect(r.path.map((p) => p.level)).toEqual([...LEVELS]);
    expect(r.others).toHaveLength(4);
    expect(r.others.map((o) => o.key)).not.toContain(r.industry);
    expect(r.scores.map((s) => s.value)).toEqual([top.peak, top.depth, top.typeFit]);
  });

  it("returns nothing without all eight type scores", () => {
    expect(industryMatches([{ key: "driver", value: 80 }])).toBeNull();
    expect(bestIndustry([{ key: "driver", value: 80 }], en, "en")).toBeNull();
  });
});

describe("paying for the finder", () => {
  let client: PGlite;
  let db: Db;
  const A1 = "11111111-1111-4111-8111-111111111111";
  const dana = "user_dana";

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client, { schema });
    await migrate(pglite, { migrationsFolder: "./drizzle" });
    db = pglite;
    setDbForTests(db);
  });
  afterAll(async () => { setDbForTests(null); await client.close(); });
  beforeEach(async () => {
    for (const t of [schema.creditLedger, schema.purchases, schema.industryAccess, schema.selfRecordings, schema.reportAccess, schema.settings]) await db.delete(t);
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });
  });

  it("costs its own number of credits, once per report, and refuses when there are too few", async () => {
    await saveBestPricing({ credits: 3 });
    expect(await bestCredits()).toBe(3);
    await B.grant(B.asUser(dana), 2, "admin");
    await expect(B.unlockBest(dana, A1, 3)).rejects.toBeInstanceOf(B.NoCredits);
    expect(await B.hasBestAccess(dana, A1)).toBe(false);

    await B.grant(B.asUser(dana), 2, "admin");
    await B.unlockBest(dana, A1, 3);
    await B.unlockBest(dana, A1, 3); // opening it again spends nothing
    expect(await B.balance(B.asUser(dana))).toBe(1);
    expect(await B.hasBestAccess(dana, A1)).toBe(true);
  });

  it("is free for admins and while charging is off, but still opened on purpose", async () => {
    await B.unlockBest("user_boss", A1, 2);
    expect(await B.balance(B.asUser("user_boss"))).toBe(0);
    expect(await B.hasBestAccess("user_boss", A1)).toBe(true);

    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: false });
    const A2 = "22222222-2222-4222-8222-222222222222"; // a report of dana's own: a report belongs to one person
    expect(await B.hasBestAccess(dana, A2)).toBe(false);
    await B.unlockBest(dana, A2, 2);
    expect(await B.hasBestAccess(dana, A2)).toBe(true);
    expect(await B.balance(B.asUser(dana))).toBe(0);
  });

  it("opens by card: the purchase carries the finder's credits and spends exactly them when the payment lands", async () => {
    const p = await startBestPurchase(B.asUser(dana), A1);
    expect(p).toMatchObject({ pack: "best", credits: 2, amountCents: 1290, unlockIndustry: B.BEST_KEY });
    expect(await B.completePurchase(p.id, { amountCents: 1290, currency: "usd" })).toBe("credited");
    expect(await B.hasBestAccess(dana, A1)).toBe(true);
    expect(await B.balance(B.asUser(dana))).toBe(0);
    expect(await B.openIndustries(A1)).toEqual([B.BEST_KEY]); // no chapter was charged on the side
  });
});
