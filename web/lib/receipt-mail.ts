/**
 * The receipt email itself: subject, HTML and plain text for one paid purchase. Pure, so the tests and the admin's
 * sample send render exactly what a buyer gets; lib/receipts.ts gathers the facts and sends it.
 * Email clients ignore stylesheets and variables, so everything is inline, in tables, in the report's gold palette.
 */
import { money } from "./money";
import type { ReceiptText } from "./i18n/receipt-en";

export type ReceiptItem =
  | { kind: "report" }
  | { kind: "credits"; n: number }
  | { kind: "company"; n: number }
  | { kind: "industry"; industry: string }
  | { kind: "best" }
  | { kind: "match"; a: string; b: string }
  | { kind: "gift"; name: string | null; reports: number; industries: number; matches: number; best?: number };

export interface ReceiptData {
  /** Short and quotable: AV- and the start of the purchase id. */
  number: string;
  paidAt: Date;
  /** The address the receipt goes to: the one the buyer signed in with. */
  to: string;
  amountCents: number;
  currency: string;
  item: ReceiptItem;
  /** Where the button leads: the thing just bought. */
  next: { kind: keyof ReceiptText["next"]; url: string };
  /** As Stripe reports the payment method: a card brand and its last four digits, and the wallet if one was used. */
  card: { brand: string; last4: string; wallet?: string | null } | null;
  /** Stripe's own receipt page for the charge, when Stripe gives one. */
  stripeUrl: string | null;
  site: string;
  supportEmail: string;
  operator: string;
  address: string;
}

export const receiptNumber = (purchaseId: string) => `AV-${purchaseId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", diners: "Diners Club", jcb: "JCB", unionpay: "UnionPay", cartes_bancaires: "Cartes Bancaires", eftpos_au: "eftpos", interac: "Interac" };
const WALLETS: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay", samsung_pay: "Samsung Pay", link: "Link", amex_express_checkout: "Amex Express Checkout", masterpass: "Masterpass", visa_checkout: "Visa Checkout" };
const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function paymentMethodLabel(card: ReceiptData["card"], t: ReceiptText): string | null {
  if (!card) return null;
  const brand = BRANDS[card.brand] ?? titleCase(card.brand);
  const base = card.last4 ? fill(t.card, { brand, last4: card.last4 }) : brand;
  const wallet = card.wallet ? WALLETS[card.wallet] ?? titleCase(card.wallet) : null;
  return wallet ? `${wallet} · ${base}` : base;
}

/** The item's name, and for a gift the lines of what is inside it. */
export function itemLines(item: ReceiptItem, t: ReceiptText): { label: string; details: string[] } {
  switch (item.kind) {
    case "report": return { label: t.items.report, details: [] };
    case "credits": return { label: fill(t.items.credits, { n: item.n }), details: [] };
    case "company": return { label: fill(t.items.companyCredits, { n: item.n }), details: [] };
    case "industry": return { label: fill(t.items.industry, { industry: item.industry }), details: [] };
    case "best": return { label: t.items.best, details: [] };
    case "match": return { label: fill(t.items.match, { a: item.a, b: item.b }), details: [] };
    case "gift": {
      const details = [
        item.reports ? fill(t.giftContents.reports, { n: item.reports }) : "",
        item.industries ? fill(t.giftContents.industries, { n: item.industries }) : "",
        item.best ? fill(t.giftContents.best, { n: item.best }) : "",
        item.matches ? fill(t.giftContents.matches, { n: item.matches }) : "",
      ].filter(Boolean);
      return { label: item.name ? fill(t.items.giftFor, { name: item.name }) : t.items.gift, details };
    }
  }
}

/** A date anyone can place: day, month, year and time in UTC, in the buyer's language. */
export function receiptDate(at: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23" };
  const tag = locale === "en" ? "en-GB" : locale;
  let text: string;
  try { text = new Intl.DateTimeFormat(tag, opts).format(at); } catch { text = new Intl.DateTimeFormat("en-GB", opts).format(at); }
  return `${text} UTC`;
}

const C = { page: "#f3ede1", card: "#fffdf8", cover: "#1c150d", coverInk: "#f5eee0", coverMuted: "#b7a98f", gold: "#e2a647", goldInk: "#2a1c05", goldText: "#8a5306", ink: "#2a2116", ink2: "#5a4f40", muted: "#7a6d5a", line: "#ebe0cb", soft: "#f8ecd7" };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function renderReceipt(d: ReceiptData, t: ReceiptText, locale: string): { subject: string; html: string; text: string } {
  const amount = money(d.amountCents, d.currency, locale);
  const { label, details } = itemLines(d.item, t);
  const date = receiptDate(d.paidAt, locale);
  const method = paymentMethodLabel(d.card, t);
  const next = t.next[d.next.kind];
  const help = fill(t.help, { email: d.supportEmail });
  const why = fill(t.why, { site: d.site, to: d.to });
  const refund = d.item.kind === "credits" || d.item.kind === "company" ? t.refund : null;
  const subject = fill(t.subject, { amount });
  const preheader = fill(t.preheader, { item: label });

  const meta: Array<[string, string]> = [[t.number, d.number], [t.date, date], ...(method ? [[t.paidWith, method] as [string, string]] : []), [t.sentTo, d.to]];

  const metaRows = meta.map(([k, v]) => `
              <tr>
                <td style="padding:7px 0;font:13px/1.4 ${SANS};color:${C.muted};">${esc(k)}</td>
                <td align="right" style="padding:7px 0;font:600 13px/1.4 ${SANS};color:${C.ink};">${esc(v)}</td>
              </tr>`).join("");

  const detailRows = details.map((line) => `<div style="margin-top:3px;font:13px/1.5 ${SANS};color:${C.ink2};">${esc(line)}</div>`).join("");

  const html = `<!doctype html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:${C.cover};padding:30px 32px 28px;">
              <div style="font:700 13px/1 ${SANS};letter-spacing:0.32em;color:${C.gold};">AVOCO</div>
              <div style="margin-top:22px;font:12px/1 ${SANS};letter-spacing:0.18em;text-transform:uppercase;color:${C.coverMuted};">${esc(t.title)}</div>
              <div style="margin-top:10px;font:500 40px/1.1 ${SERIF};color:${C.coverInk};">${esc(amount)}</div>
              <div style="margin-top:10px;font:15px/1.5 ${SANS};color:${C.coverMuted};">${esc(t.thanks)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${metaRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};">
                <tr>
                  <td style="padding:16px 0 4px;font:700 11px/1 ${SANS};letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};">${esc(t.item)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 16px;border-bottom:1px solid ${C.line};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font:600 15px/1.45 ${SANS};color:${C.ink};">${esc(label)}${detailRows}</td>
                        <td align="right" valign="top" style="padding-left:16px;font:600 15px/1.45 ${SANS};color:${C.ink};white-space:nowrap;">${esc(amount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font:700 15px/1.4 ${SANS};color:${C.ink};">${esc(t.total)}</td>
                        <td align="right" style="font:500 22px/1.2 ${SERIF};color:${C.goldText};white-space:nowrap;">${esc(amount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font:15px/1.55 ${SANS};color:${C.ink};">${esc(next.lead)}</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        <td style="background:${C.gold};border-radius:999px;">
                          <a href="${esc(d.next.url)}" style="display:inline-block;padding:12px 22px;font:700 14px/1 ${SANS};color:${C.goldInk};text-decoration:none;">${esc(next.cta)} &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 30px;">${d.stripeUrl ? `
              <div style="margin-bottom:14px;font:13px/1.5 ${SANS};"><a href="${esc(d.stripeUrl)}" style="color:${C.goldText};text-decoration:underline;">${esc(t.stripe)}</a></div>` : ""}
              <div style="font:13px/1.6 ${SANS};color:${C.ink2};">${esc(help)}</div>${refund ? `
              <div style="margin-top:6px;font:13px/1.6 ${SANS};color:${C.ink2};">${esc(refund)}</div>` : ""}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:18px 32px 0;font:12px/1.6 ${SANS};color:${C.muted};text-align:center;">
              ${esc(why)}<br>${esc(d.operator)}${d.address ? ` · ${esc(d.address)}` : ""} · <a href="https://${esc(d.site)}" style="color:${C.muted};">${esc(d.site)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `AVOCO · ${t.title}`,
    "",
    `${amount}`,
    t.thanks,
    "",
    ...meta.map(([k, v]) => `${k}: ${v}`),
    "",
    `${t.item}: ${label}`,
    ...details.map((line) => `  - ${line}`),
    `${t.total}: ${amount}`,
    "",
    next.lead,
    `${next.cta}: ${d.next.url}`,
    ...(d.stripeUrl ? ["", `${t.stripe}: ${d.stripeUrl}`] : []),
    "",
    help,
    ...(refund ? [refund] : []),
    "",
    "--",
    why,
    `${d.operator}${d.address ? ` · ${d.address}` : ""} · https://${d.site}`,
  ].join("\n");

  return { subject, html, text };
}
