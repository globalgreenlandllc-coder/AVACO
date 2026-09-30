/**
 * The admin pricing form, read the way people type prices: "12.50", "12,50", "$12.50" and "1 290,00" all mean what
 * they say. Nothing is ever quietly replaced: a box that can't be read is an error that names the box, and then
 * nothing at all is saved, so a half-typed form never leaves half its prices behind. Pure, tested.
 */

export interface PricingPack { id: string; credits: number; amountCents: number; audience: "user" | "workspace" }

/** What the form holds now: the page renders these, and a save is compared against them. */
export interface PricingCurrent {
  enabled: boolean;
  /** Every account's first report free, once. */
  firstFree: boolean;
  currency: string;
  packs: PricingPack[];
  freePreviews: number;
  trialCredits: number;
  industryCents: number;
  bestCents: number;
  bestCredits: number;
  matchCents: number;
  matchCredits: number;
}

export type PricingValues = PricingCurrent;

export type PricingRead = { ok: true; values: PricingValues } | { ok: false; errors: Record<string, string> };

const MIN_CENTS = 50;
const MAX_CENTS = 100_000_00;

/**
 * A price in cents, or null when the text isn't one. The last "." or "," is the decimal point when two or fewer digits
 * follow it; every other separator, space and currency sign is ignored ("1,290.00", "1 290,00", "$9", "€12,5").
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/[\s  '’]/g, "").replace(/^[^\d.,-]+|[^\d.,]+$/g, "");
  if (!/^\d[\d.,]*$/.test(s) || /[.,]{2}/.test(s)) return null; // a doubled separator is a typo, not a price
  const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (last >= 0 && s.length - last - 1 <= 2) s = `${s.slice(0, last).replace(/[.,]/g, "")}.${s.slice(last + 1)}`;
  else s = s.replace(/[.,]/g, "");
  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** A whole number from min to max, or null. */
export function parseCount(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== "string" || !/^\s*\d+\s*$/.test(raw)) return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** Everything the form sent, checked; the box names are the form's own. */
export function readPricingForm(form: { get(name: string): unknown }, current: PricingCurrent, names: Record<string, string> = {}): PricingRead {
  const errors: Record<string, string> = {};
  const text = (name: string) => { const v = form.get(name); return typeof v === "string" ? v : ""; };
  const price = (name: string, label: string): number => {
    const cents = parsePrice(text(name));
    if (cents === null) { errors[name] = `${label}: "${text(name)}" is not a price. Type it like 12.50.`; return 0; }
    if (cents < MIN_CENTS || cents > MAX_CENTS) { errors[name] = `${label}: a price between 0.50 and 100,000.`; return 0; }
    return cents;
  };
  const count = (name: string, label: string, min: number, max: number): number => {
    const n = parseCount(text(name), min, max);
    if (n === null) errors[name] = `${label}: a whole number from ${min} to ${max}.`;
    return n ?? 0;
  };

  const packs = current.packs.map((p) => {
    const label = names[p.id] ?? p.id;
    return { ...p, credits: count(`credits:${p.id}`, `${label}, credits`, 1, 10_000), amountCents: price(`price:${p.id}`, `${label}, price`) };
  });
  // "Complete Personality Analysis, per report" edits the one-credit pack for people: a changed value there wins.
  const single = current.packs.find((p) => p.audience === "user" && p.credits === 1);
  const typeCents = price("typePrice", "Complete Personality Analysis");
  const values: PricingValues = {
    enabled: form.get("enabled") === "on",
    firstFree: form.get("firstFree") === "on",
    currency: text("currency").trim().toLowerCase(),
    packs: single && typeCents && typeCents !== single.amountCents ? packs.map((p) => (p.id === single.id ? { ...p, amountCents: typeCents } : p)) : packs,
    freePreviews: count("freePreviews", "Free previews", 0, 100),
    trialCredits: count("trialCredits", "Trial credits", 0, 1000),
    industryCents: price("industryPrice", "Career Fit"),
    bestCents: price("bestPrice", "Find My Best-Fit Industry"),
    bestCredits: count("bestCredits", "Find My Best-Fit Industry, credits", 1, 100),
    matchCents: price("matchPrice", "Relationship & Compatibility"),
    matchCredits: count("matchCredits", "Relationship & Compatibility, credits", 1, 100),
  };
  if (!/^[a-z]{3}$/.test(values.currency)) errors.currency = "Currency: three letters, like USD.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

/** A price as the box shows it: "12.50". */
export const priceText = (cents: number) => (cents / 100).toFixed(2);
