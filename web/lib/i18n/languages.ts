/**
 * The languages a visitor can choose. Two are written by hand (English is the original, Russian its
 * translation); the rest can be added from the admin portal, where the English dictionary is translated
 * by DeepL once and kept. Names are in the language itself, as a language menu should show them.
 */
export interface Language { code: string; name: string; deepl: string }

export const BUILT_IN: Language[] = [
  { code: "en", name: "English", deepl: "EN-US" },
  { code: "ru", name: "Русский", deepl: "RU" },
];

/** Languages DeepL can translate into, by our code, native name and DeepL's target code. */
export const TRANSLATABLE: Language[] = [
  { code: "es", name: "Español", deepl: "ES" },
  { code: "de", name: "Deutsch", deepl: "DE" },
  { code: "fr", name: "Français", deepl: "FR" },
  { code: "it", name: "Italiano", deepl: "IT" },
  { code: "pt", name: "Português", deepl: "PT-BR" },
  { code: "nl", name: "Nederlands", deepl: "NL" },
  { code: "pl", name: "Polski", deepl: "PL" },
  { code: "uk", name: "Українська", deepl: "UK" },
  { code: "tr", name: "Türkçe", deepl: "TR" },
  { code: "ar", name: "العربية", deepl: "AR" },
  { code: "zh", name: "中文", deepl: "ZH-HANS" },
  { code: "ja", name: "日本語", deepl: "JA" },
  { code: "ko", name: "한국어", deepl: "KO" },
  { code: "id", name: "Bahasa Indonesia", deepl: "ID" },
  { code: "cs", name: "Čeština", deepl: "CS" },
  { code: "da", name: "Dansk", deepl: "DA" },
  { code: "el", name: "Ελληνικά", deepl: "EL" },
  { code: "fi", name: "Suomi", deepl: "FI" },
  { code: "hu", name: "Magyar", deepl: "HU" },
  { code: "ro", name: "Română", deepl: "RO" },
  { code: "sv", name: "Svenska", deepl: "SV" },
  { code: "nb", name: "Norsk", deepl: "NB" },
  { code: "sk", name: "Slovenčina", deepl: "SK" },
  { code: "bg", name: "Български", deepl: "BG" },
  { code: "lt", name: "Lietuvių", deepl: "LT" },
  { code: "lv", name: "Latviešu", deepl: "LV" },
  { code: "et", name: "Eesti", deepl: "ET" },
  { code: "sl", name: "Slovenščina", deepl: "SL" },
  { code: "he", name: "עברית", deepl: "HE" },
  { code: "vi", name: "Tiếng Việt", deepl: "VI" },
  { code: "th", name: "ไทย", deepl: "TH" },
];

export const languageOf = (code: string): Language | undefined => [...BUILT_IN, ...TRANSLATABLE].find((l) => l.code === code);
