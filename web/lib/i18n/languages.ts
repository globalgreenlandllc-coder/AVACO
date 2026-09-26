/**
 * The languages a visitor can choose. Two are written by hand (English is the original, Russian its
 * translation); the rest can be added from the admin portal, where the English dictionary is translated
 * by DeepL once and kept. Names are in the language itself, as a language menu should show them; the flag
 * is the country whose variant DeepL produces (US English, Brazilian Portuguese, mainland Chinese).
 */
export interface Language { code: string; name: string; flag: string; deepl: string; rtl?: boolean }

export const BUILT_IN: Language[] = [
  { code: "en", name: "English (US)", flag: "🇺🇸", deepl: "EN-US" },
  { code: "ru", name: "Русский", flag: "🇷🇺", deepl: "RU" },
];

/** Languages DeepL can translate into, by our code, native name and DeepL's target code. */
export const TRANSLATABLE: Language[] = [
  { code: "es", name: "Español", flag: "🇪🇸", deepl: "ES" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", deepl: "DE" },
  { code: "fr", name: "Français", flag: "🇫🇷", deepl: "FR" },
  { code: "it", name: "Italiano", flag: "🇮🇹", deepl: "IT" },
  { code: "pt", name: "Português", flag: "🇧🇷", deepl: "PT-BR" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", deepl: "NL" },
  { code: "pl", name: "Polski", flag: "🇵🇱", deepl: "PL" },
  { code: "uk", name: "Українська", flag: "🇺🇦", deepl: "UK" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", deepl: "TR" },
  { code: "ar", name: "العربية", flag: "🇸🇦", deepl: "AR", rtl: true },
  { code: "zh", name: "中文", flag: "🇨🇳", deepl: "ZH-HANS" },
  { code: "ja", name: "日本語", flag: "🇯🇵", deepl: "JA" },
  { code: "ko", name: "한국어", flag: "🇰🇷", deepl: "KO" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩", deepl: "ID" },
  { code: "cs", name: "Čeština", flag: "🇨🇿", deepl: "CS" },
  { code: "da", name: "Dansk", flag: "🇩🇰", deepl: "DA" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷", deepl: "EL" },
  { code: "fi", name: "Suomi", flag: "🇫🇮", deepl: "FI" },
  { code: "hu", name: "Magyar", flag: "🇭🇺", deepl: "HU" },
  { code: "ro", name: "Română", flag: "🇷🇴", deepl: "RO" },
  { code: "sv", name: "Svenska", flag: "🇸🇪", deepl: "SV" },
  { code: "nb", name: "Norsk", flag: "🇳🇴", deepl: "NB" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰", deepl: "SK" },
  { code: "bg", name: "Български", flag: "🇧🇬", deepl: "BG" },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹", deepl: "LT" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻", deepl: "LV" },
  { code: "et", name: "Eesti", flag: "🇪🇪", deepl: "ET" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮", deepl: "SL" },
  { code: "he", name: "עברית", flag: "🇮🇱", deepl: "HE", rtl: true },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳", deepl: "VI" },
  { code: "th", name: "ไทย", flag: "🇹🇭", deepl: "TH" },
];

export const languageOf = (code: string): Language | undefined => [...BUILT_IN, ...TRANSLATABLE].find((l) => l.code === code);

/** Text direction for the <html> element: Arabic and Hebrew read right to left. */
export const directionOf = (code: string): "rtl" | "ltr" => (languageOf(code)?.rtl ? "rtl" : "ltr");
