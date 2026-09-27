import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** The gateway lists every recording of an account; here, whatever `recordings` holds. */
const store = vi.hoisted(() => ({ recordings: [] as unknown[] }));
vi.mock("@/lib/gateway", () => ({ gateway: { listAllFor: async () => store.recordings } }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { cleanName, forgetPeople, knownNames, nameSlug, namesFor, peopleIn, personKey, reportsOf, setPerson } from "@/lib/people";
import { profileFor } from "@/lib/profile";
import type { Analysis } from "@/lib/gateway";

let client: PGlite;
let db: Db;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => { await db.delete(schema.reportPeople); store.recordings = []; });

describe("names as they are kept", () => {
  it("trims, collapses spaces, drops control characters, caps the length; empty or not text means the account holder", () => {
    expect(cleanName("  Anna   Maria \n")).toBe("Anna Maria");
    expect(cleanName("An\u0000na")).toBe("An na");
    expect(cleanName("x".repeat(80))).toHaveLength(60);
    expect(cleanName("   ")).toBeNull();
    expect(cleanName(42)).toBeNull();
    expect(cleanName(undefined)).toBeNull();
  });

  it("knows a person regardless of case and spacing, and makes file-name slugs in any alphabet", () => {
    expect(personKey(" anna ")).toBe(personKey("ANNA"));
    expect(personKey(null)).toBe("");
    expect(nameSlug("Anna Smith")).toBe("anna-smith");
    expect(nameSlug("Анна-Мария!")).toBe("анна-мария");
  });

  it("lists the people behind reports, the account holder first, with how many reports each", () => {
    const reports = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const names = new Map([["a", "Anna"], ["c", "anna"], ["d", "Daniel"]]);
    expect(peopleIn(reports, names)).toEqual([
      { key: "", name: null, count: 1 },
      { key: "anna", name: "Anna", count: 2 },
      { key: "daniel", name: "Daniel", count: 1 },
    ]);
    expect(reportsOf(reports, names, "anna").map((r) => r.id)).toEqual(["a", "c"]);
    expect(reportsOf(reports, names, "").map((r) => r.id)).toEqual(["b"]);
  });
});

describe("naming reports", () => {
  it("names a report, corrects one person's spelling everywhere, and gives a report back to the account holder", async () => {
    await setPerson("user_a", id(1), "anna");
    await setPerson("user_a", id(2), "Daniel");
    expect(await setPerson("user_a", id(3), "  Anna ")).toBe("Anna");
    expect(await namesFor("user_a")).toEqual(new Map([[id(1), "Anna"], [id(2), "Daniel"], [id(3), "Anna"]]));
    expect(new Set(await knownNames("user_a"))).toEqual(new Set(["Anna", "Daniel"])); // one entry per person, as last spelled

    expect(await setPerson("user_a", id(2), "")).toBeNull();
    expect((await namesFor("user_a")).has(id(2))).toBe(false);
    await forgetPeople([id(1)]);
    expect([...(await namesFor("user_a")).keys()]).toEqual([id(3)]);
  });

  it("never touches another account's names", async () => {
    await setPerson("user_a", id(1), "Anna");
    await setPerson("user_b", id(2), "anna");
    await setPerson("user_a", id(3), "ANNA");
    expect(await namesFor("user_b")).toEqual(new Map([[id(2), "anna"]]));
    expect(await setPerson("user_b", id(1), "")).toBeNull(); // not theirs: nothing deleted
    expect((await namesFor("user_a")).get(id(1))).toBe("ANNA");
  });
});

describe("a person's type across recordings", () => {
  const TYPES = ["analyst", "catalyst", "driver", "harmonizer", "mediator", "organizer", "performer", "skeptic"];
  /** One completed recording led by `leader`. */
  const recording = (n: number, leader: string, value: number): Analysis => ({
    id: id(n), status: "completed", type: "both", external_user_id: "user_a", created_at: `2026-09-2${n}T10:00:00.000Z`, completed_at: null, emostate: [], error: null,
    psytype: TYPES.map((key) => ({ key, label: key, value: key === leader ? value : 20 })) as Analysis["psytype"],
  });

  it("averages only the same person's recordings, so someone recorded on the account never shifts the owner's type", async () => {
    store.recordings = [recording(1, "analyst", 70), recording(2, "analyst", 60), recording(3, "catalyst", 90), recording(4, "catalyst", 80)];
    await setPerson("user_a", id(3), "Anna");
    await setPerson("user_a", id(4), "anna");

    const mine = await profileFor("user_a", store.recordings[0] as Analysis);
    expect(mine.person).toBeNull();
    expect(mine.consensus?.n).toBe(2);
    expect(mine.consensus?.leader).toBe("analyst");
    expect(mine.psytype?.[0]).toMatchObject({ key: "analyst", value: 65 });

    const hers = await profileFor("user_a", store.recordings[2] as Analysis);
    expect(hers.person).toBe("anna");
    expect(hers.consensus?.n).toBe(2);
    expect(hers.psytype?.[0]).toMatchObject({ key: "catalyst", value: 85 });
  });
});
