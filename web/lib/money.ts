import type { Pack } from "./billing";

export function money(amountCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2 }).format(amountCents / 100);
}

export const packViews = (packs: Pack[], currency: string, locale: string) =>
  packs.map((p) => ({ id: p.id, credits: p.credits, price: money(p.amountCents, currency, locale), perReport: money(Math.round(p.amountCents / p.credits), currency, locale) }));
