import { cookies, headers } from "next/headers";
import { en, type Dict } from "./en";
import { ru } from "./ru";

export type Locale = "en" | "ru";
export type { Dict };
export const LOCALE_COOKIE = "lang";
const dictionaries: Record<Locale, Dict> = { en, ru };

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "ru";

/** The visitor's choice (cookie) wins; otherwise the browser's language; otherwise English. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return pickFromHeader((await headers()).get("accept-language"));
}

export function pickFromHeader(header: string | null): Locale {
  const first = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  // Russian is widely read across the region AVOCO serves (kk, be, uk browsers included).
  return /^(ru|kk|be|uk)\b/.test(first) ? "ru" : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
