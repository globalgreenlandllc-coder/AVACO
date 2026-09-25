import { cookies } from "next/headers";
import { availableLanguages, translatedDict } from "../translate";
import { en, type Dict } from "./en";
import { ru } from "./ru";

/** A language code from lib/i18n/languages.ts: "en", "ru", or one added in the admin portal. */
export type Locale = string;
export type { Dict };
export const LOCALE_COOKIE = "lang";
const handWritten: Record<string, Dict> = { en, ru };

/** The two hand-written languages. Added languages are known only after asking the database: see isAvailableLocale. */
export const isLocale = (v: unknown): v is "en" | "ru" => v === "en" || v === "ru";

export async function isAvailableLocale(v: unknown): Promise<boolean> {
  return typeof v === "string" && (isLocale(v) || (await availableLanguages()).some((l) => l.code === v));
}

/** English for everyone until the visitor picks a language in the menu; the choice is kept in a cookie for a year. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (!chosen || chosen === "en") return "en";
  return (await isAvailableLocale(chosen)) ? chosen : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: handWritten[locale] ?? (await translatedDict(locale)) };
}

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };

export function formatDate(iso: string, locale: Locale): string {
  const tag = locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : locale;
  try {
    return new Intl.DateTimeFormat(tag, DATE).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-GB", DATE).format(new Date(iso));
  }
}
