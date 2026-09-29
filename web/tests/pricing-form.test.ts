import { describe, expect, it } from "vitest";
import { parseCount, parsePrice, readPricingForm, type PricingCurrent } from "@/lib/pricing-form";

describe("prices as people type them", () => {
  it("reads dots, commas, currency signs and thousands separators", () => {
    expect(parsePrice("12.50")).toBe(1250);
    expect(parsePrice("12,50")).toBe(1250);
    expect(parsePrice("15,9")).toBe(1590);
    expect(parsePrice("$9")).toBe(900);
    expect(parsePrice("9.")).toBe(900);
    expect(parsePrice(" 14.90 USD ")).toBe(1490);
    expect(parsePrice("€12,5")).toBe(1250);
    expect(parsePrice("1,290.00")).toBe(129000);
    expect(parsePrice("1 290,00")).toBe(129000);
    expect(parsePrice("1,290")).toBe(129000);
  });

  it("refuses what is not a price instead of guessing", () => {
    for (const bad of ["", "   ", "abc", "-5", "12..5x", "twelve", undefined, 12]) expect(parsePrice(bad)).toBeNull();
  });

  it("reads whole counts within bounds only", () => {
    expect(parseCount(" 2 ", 1, 100)).toBe(2);
    expect(parseCount("0", 1, 100)).toBeNull();
    expect(parseCount("1.5", 1, 100)).toBeNull();
    expect(parseCount("101", 1, 100)).toBeNull();
  });
});

describe("the pricing form", () => {
  const current: PricingCurrent = {
    enabled: true, currency: "usd", freePreviews: 1, trialCredits: 1, industryCents: 490, bestCents: 1290, bestCredits: 2, matchCents: 1490, matchCredits: 2,
    packs: [{ id: "one", credits: 1, amountCents: 900, audience: "user" }, { id: "team25", credits: 25, amountCents: 14900, audience: "workspace" }],
  };
  const form = (over: Record<string, string>) => {
    const base: Record<string, string> = {
      enabled: "on", currency: "usd", "credits:one": "1", "price:one": "9.00", "credits:team25": "25", "price:team25": "149.00", typePrice: "9.00",
      industryPrice: "4.90", bestPrice: "12.90", bestCredits: "2", matchPrice: "14.90", matchCredits: "2", freePreviews: "1", trialCredits: "1",
    };
    const all = { ...base, ...over };
    return { get: (name: string) => (name in all ? all[name] : null) };
  };

  it("saves the prices exactly as typed, commas included", () => {
    const read = readPricingForm(form({ industryPrice: "5,90", bestPrice: "$13.90", matchPrice: "15,90", bestCredits: "1" }), current);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.values).toMatchObject({ industryCents: 590, bestCents: 1390, matchCents: 1590, bestCredits: 1 });
  });

  it("lets the Complete Personality Analysis box set the single-report price, and otherwise keeps the table's", () => {
    const viaBox = readPricingForm(form({ typePrice: "12,50" }), current);
    expect(viaBox.ok && viaBox.values.packs.find((p) => p.id === "one")?.amountCents).toBe(1250);
    const viaTable = readPricingForm(form({ "price:one": "11.00" }), current);
    expect(viaTable.ok && viaTable.values.packs.find((p) => p.id === "one")?.amountCents).toBe(1100);
  });

  it("saves nothing when any box can't be read, and says which one", () => {
    const read = readPricingForm(form({ matchPrice: "abc", "price:team25": "", freePreviews: "x" }), current, { team25: "Team 25" });
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(Object.keys(read.errors).sort()).toEqual(["freePreviews", "matchPrice", "price:team25"]);
    expect(read.errors.matchPrice).toContain('"abc" is not a price');
    expect(read.errors["price:team25"]).toContain("Team 25, price");
  });

  it("refuses prices below 0.50 and a currency that isn't three letters", () => {
    const read = readPricingForm(form({ bestPrice: "0.10", currency: "dollars" }), current);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(Object.keys(read.errors).sort()).toEqual(["bestPrice", "currency"]);
  });
});
