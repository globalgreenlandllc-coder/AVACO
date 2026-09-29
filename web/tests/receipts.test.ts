import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

/** Pretends to be Google's mail server: `verify` is the login, `sendMail` records what would have been sent. */
const smtp = vi.hoisted(() => ({ verify: vi.fn(async () => true), sendMail: vi.fn(async (_mail: unknown) => ({ messageId: "m1" })) }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => smtp } }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";
import { clearEmailSettings, emailConfig, emailStatus, saveEmailSettings } from "@/lib/email";
import { receiptEn } from "@/lib/i18n/receipt-en";
import { receiptRu } from "@/lib/i18n/receipt-ru";
import { itemLines, paymentMethodLabel, receiptNumber, renderReceipt, type ReceiptData } from "@/lib/receipt-mail";
import { sendReceipt } from "@/lib/receipts";

let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111";
const SECRET = "test-settings-secret-0123456789";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.creditLedger, schema.purchases, schema.reportAccess, schema.selfRecordings, schema.settings]) await db.delete(t);
  smtp.verify.mockClear();
  smtp.sendMail.mockClear();
  vi.stubEnv("SETTINGS_SECRET", SECRET);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const sample = (over: Partial<ReceiptData> = {}): ReceiptData => ({
  number: "AV-1A2B3C4D", paidAt: new Date("2026-09-26T18:05:00Z"), to: "dana@example.com", amountCents: 900, currency: "usd",
  item: { kind: "report" }, next: { kind: "report", url: "https://www.avocousa.us/reports/abc" },
  card: { brand: "visa", last4: "4242", wallet: null }, stripeUrl: "https://pay.stripe.com/receipts/xyz",
  site: "avocousa.us", supportEmail: "support@avocousa.us", operator: "AVOCO USA", address: "", ...over,
});

describe("the receipt email", () => {
  it("says what was paid, for what, with which card, and links to the purchase and Stripe's receipt", () => {
    const mail = renderReceipt(sample(), receiptEn, "en");
    expect(mail.subject).toBe("Your AVOCO receipt · $9");
    for (const part of ["Complete Personality Analysis", "Visa ending in 4242", "AV-1A2B3C4D", "26 September 2026", "18:05 UTC", "dana@example.com", "https://www.avocousa.us/reports/abc", "https://pay.stripe.com/receipts/xyz", "support@avocousa.us"]) {
      expect(mail.html).toContain(part);
      expect(mail.text).toContain(part);
    }
  });

  it("escapes names people typed, so a name can't inject markup into the email", () => {
    const mail = renderReceipt(sample({ item: { kind: "match", a: "Ann <b>", b: "Tom \"&\" Co" } }), receiptEn, "en");
    expect(mail.html).toContain("Ann &lt;b&gt; &amp; Tom &quot;&amp;&quot; Co");
    expect(mail.html).not.toContain("Ann <b>");
    expect(mail.text).toContain("Relationship & Compatibility · Ann <b> & Tom \"&\" Co");
  });

  it("is written in the buyer's language", () => {
    const mail = renderReceipt(sample({ amountCents: 1490 }), receiptRu, "ru");
    expect(mail.subject).toContain("Ваш чек AVOCO");
    expect(mail.subject).toContain("14,90");
    expect(mail.html).toContain("Полный анализ личности");
    expect(mail.html).toContain("сентября 2026");
    expect(mail.html).toContain('lang="ru"');
  });

  it("lists what is inside a gift, and names its recipient", () => {
    expect(itemLines({ kind: "gift", name: "Mia", reports: 2, industries: 1, matches: 0 }, receiptEn)).toEqual({
      label: "Gift for Mia", details: ["Complete Personality Analysis × 2", "Career Fit × 1"],
    });
    expect(itemLines({ kind: "gift", name: null, reports: 1, industries: 0, matches: 1 }, receiptEn).label).toBe("Gift");
  });

  it("names the card, the wallet it came through, and leaves the line out when Stripe gave nothing", () => {
    expect(paymentMethodLabel({ brand: "amex", last4: "0005", wallet: "apple_pay" }, receiptEn)).toBe("Apple Pay · American Express ending in 0005");
    expect(paymentMethodLabel({ brand: "link", last4: "", wallet: null }, receiptEn)).toBe("Link");
    expect(paymentMethodLabel(null, receiptEn)).toBeNull();
    expect(renderReceipt(sample({ card: null, stripeUrl: null }), receiptEn, "en").text).not.toMatch(/Paid with|Stripe/);
  });

  it("numbers receipts from the purchase id", () => {
    expect(receiptNumber("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d")).toBe("AV-1A2B3C4D");
  });
});

describe("the mailbox receipts are sent from", () => {
  it("is stored only after Google accepted the login, with the password sealed and never shown back", async () => {
    const saved = await saveEmailSettings({ user: " Support@AvocoUSA.us ", pass: "abcd efgh ijkl mnop", fromName: "AVOCO <x>" }, "admin@example.com");
    expect(saved).toEqual({ ok: true, from: "support@avocousa.us" });
    expect(smtp.verify).toHaveBeenCalledOnce();
    const [row] = await db.select().from(schema.settings);
    expect(JSON.stringify(row.value)).not.toContain("abcdefghijklmnop");
    expect(await emailConfig()).toMatchObject({ user: "support@avocousa.us", pass: "abcdefghijklmnop", fromName: "AVOCO x", host: "smtp.gmail.com", port: 465 });
    const status = await emailStatus();
    expect(status).toMatchObject({ connected: true, source: "portal", from: "support@avocousa.us", savedBy: "admin@example.com" });
    expect(JSON.stringify(status)).not.toContain("abcdefghijklmnop");
    await clearEmailSettings();
    expect((await emailStatus()).connected).toBe(false);
  });

  it("is refused, and nothing stored, when Google refuses the password or the address is not one", async () => {
    smtp.verify.mockRejectedValueOnce(Object.assign(new Error("Invalid login"), { responseCode: 535 }));
    const refused = await saveEmailSettings({ user: "support@avocousa.us", pass: "wrongwrongwrongw" }, "admin@example.com");
    expect(refused).toMatchObject({ ok: false, reason: expect.stringContaining("Google refused") });
    expect(await saveEmailSettings({ user: "support", pass: "abcdefghijklmnop" }, "a")).toMatchObject({ ok: false });
    expect(await db.select().from(schema.settings)).toHaveLength(0);
    expect(await emailConfig()).toBeNull();
  });
});

describe("sending the receipt after a payment", () => {
  /** Clerk knows the buyer's sign-in email; Stripe knows the card, the language and the amount charged. */
  function stubServices(opts: { signIn?: string | null; checkoutEmail?: string; lang?: string } = {}) {
    vi.stubEnv("CLERK_SECRET_KEY", "clerk-secret-for-tests");
    vi.stubEnv("STRIPE_SECRET_KEY", "stripe-secret-for-tests");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "stripe-webhook-for-tests");
    vi.stubEnv("SMTP_USER", "support@avocousa.us");
    vi.stubEnv("SMTP_PASS", "abcdefghijklmnop");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.startsWith("https://api.clerk.com/v1/users/")) {
        const email = opts.signIn === undefined ? "dana@example.com" : opts.signIn;
        return Response.json({ primary_email_address_id: "e1", email_addresses: email ? [{ id: "e1", email_address: email, verification: { status: "verified" } }] : [] });
      }
      if (u.includes("/v1/checkout/sessions/cs_test_1")) {
        return Response.json({
          amount_total: 1900, currency: "usd", success_url: "https://www.avocousa.us/credits?paid=1&session={CHECKOUT_SESSION_ID}",
          customer_details: { email: opts.checkoutEmail ?? "typed@example.com" }, metadata: { purchase_id: "x", lang: opts.lang ?? "en" },
          payment_intent: { latest_charge: { receipt_url: "https://pay.stripe.com/receipts/r1", payment_method_details: { type: "card", card: { brand: "visa", last4: "4242", wallet: null } } } },
        });
      }
      return new Response("not found", { status: 404 });
    }));
  }

  async function paidPurchase(owner = B.asUser("user_dana"), pack = "three") {
    const p = await B.startPurchase(owner, pack);
    await B.attachStripeSession(p.id, "cs_test_1");
    return p;
  }

  it("goes once, to the email the buyer signs in with, in their language, when the payment is recorded", async () => {
    stubServices({ lang: "ru" });
    const p = await paidPurchase();
    expect(await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" })).toBe("credited");
    await vi.waitFor(() => expect(smtp.sendMail).toHaveBeenCalledOnce());
    const mail = smtp.sendMail.mock.calls[0][0] as { to: string; from: { name: string; address: string }; replyTo?: string; subject: string; html: string; text: string };
    expect(mail.to).toBe("dana@example.com");
    expect(mail.from).toEqual({ name: "AVOCO", address: "support@avocousa.us" });
    expect(mail.subject).toContain("Ваш чек AVOCO");
    expect(mail.html).toContain("Кредиты на отчёты × 3");
    expect(mail.html).toContain("https://www.avocousa.us/credits");
    expect(mail.html).toContain("https://pay.stripe.com/receipts/r1");

    // Stripe retries the webhook and the buyer's page confirms the same payment: no second receipt.
    expect(await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" })).toBe("already");
    await new Promise((r) => setTimeout(r, 50));
    expect(smtp.sendMail).toHaveBeenCalledOnce();
  });

  it("uses the email given to Stripe when the payer has no sign-in email on file", async () => {
    stubServices({ signIn: null, checkoutEmail: "boss@company.com" });
    const p = await paidPurchase(B.asWorkspace("ws1"), "team25");
    expect(await sendReceipt(p.id)).toEqual({ sent: false, reason: "purchase not paid" });
    await B.completePurchase(p.id, { amountCents: 14900, currency: "usd" });
    await vi.waitFor(() => expect(smtp.sendMail).toHaveBeenCalledOnce());
    const mail = smtp.sendMail.mock.calls[0][0] as { to: string; html: string };
    expect(mail.to).toBe("boss@company.com");
    expect(mail.html).toContain("Company report credits × 25");
    expect(mail.html).toContain("https://www.avocousa.us/w/ws1");
  });

  it("opens the report the buyer came from, and sends nothing while no mailbox is connected", async () => {
    stubServices();
    vi.stubEnv("SMTP_USER", "");
    const p = await B.startPurchase(B.asUser("user_dana"), "one", A1);
    await B.attachStripeSession(p.id, "cs_test_1");
    await B.completePurchase(p.id, { amountCents: 900, currency: "usd" });
    expect(await sendReceipt(p.id)).toEqual({ sent: false, reason: "no mailbox connected" });
    expect(smtp.sendMail).not.toHaveBeenCalled();

    vi.stubEnv("SMTP_USER", "support@avocousa.us");
    expect(await sendReceipt(p.id)).toEqual({ sent: true, to: "dana@example.com" });
    const mail = smtp.sendMail.mock.calls[0][0] as { html: string };
    expect(mail.html).toContain("Complete Personality Analysis");
    expect(mail.html).toContain(`https://www.avocousa.us/reports/${A1}`);
  });
});
