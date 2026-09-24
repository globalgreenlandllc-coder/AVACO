import { cookies } from "next/headers";
import { en, type Dict } from "./en";
import { ru } from "./ru";

export type Locale = "en" | "ru";
export type { Dict };
export const LOCALE_COOKIE = "lang";
const dictionaries: Record<Locale, Dict> = { en, ru };

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "ru";

/** English for everyone until the visitor picks a language with the switch; the choice is kept in a cookie for a year. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
