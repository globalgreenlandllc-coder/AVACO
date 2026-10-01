import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gateway", () => ({ gateway: {} }));
vi.mock("@/lib/admin", () => ({ isAdminUser: async (id: string) => id === "user_admin" }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";

let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111", A2 = "22222222-2222-4222-8222-222222222222";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.creditLedger, schema.reportAccess, schema.selfRecordings, schema.settings]) await db.delete(t);
  // two recordings of the account: reports that need a credit unless opened otherwise
  await db.insert(schema.selfRecordings).values([{ analysisId: A1, userId: "user_a" }, { analysisId: A2, userId: "user_a" }]);
  await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true, freeFirstReport: true });
});

describe("the free first report", () => {
  it("opens an account's first report once, and never a second", async () => {
    expect(await B.welcomeReportWaiting("user_a")).toBe(true);
    expect(await B.openWelcomeReport("user_a", A1)).toBe(true);
    expect(await B.hasFullAccess("user_a", A1)).toBe(true);
    expect(await B.usedWelcomeReport("user_a")).toBe(true);
    expect(await B.welcomeReportWaiting("user_a")).toBe(false);
    expect(await B.openWelcomeReport("user_a", A2)).toBe(false);
    expect(await B.hasFullAccess("user_a", A2)).toBe(false);
    expect(await B.balance(B.asUser("user_a"))).toBe(0); // no credit was spent or given
    // another account has its own
    expect(await B.openWelcomeReport("user_b", A2)).toBe(true);
  });

  it("is not offered when switched off, when charging is off, or to admins and open-host visitors", async () => {
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true, freeFirstReport: false });
    expect(await B.welcomeReportWaiting("user_a")).toBe(false);
    expect(await B.openWelcomeReport("user_a", A1)).toBe(false);
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: false, freeFirstReport: true });
    expect(await B.welcomeReportWaiting("user_a")).toBe(false);
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true, freeFirstReport: true });
    expect(await B.welcomeReportWaiting("user_admin")).toBe(false);
    expect(await B.welcomeReportWaiting("open:1234")).toBe(false);
  });

  it("is off unless switched on, also for settings saved before the switch existed", async () => {
    await db.delete(schema.settings);
    await db.insert(schema.settings).values({ key: "billing", value: { enabled: true, currency: "usd", packs: [], freePreviewsPer30Days: 3, workspaceTrialCredits: 5 } });
    expect((await B.getSettings()).freeFirstReport).toBe(false);
    expect(B.DEFAULT_SETTINGS.freeFirstReport).toBe(false);
  });
});
