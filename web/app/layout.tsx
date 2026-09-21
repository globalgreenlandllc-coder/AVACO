import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { enUS, ruRU } from "@clerk/localizations";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Header } from "@/components/Header";
import { getDict } from "@/lib/i18n";
import "./globals.css";

// Both families ship Cyrillic, so English and Russian look the same.
const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Cormorant_Garamond({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], variable: "--font-display" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.brand} · ${t.home.eyebrow}`, description: t.home.lead };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  return (
    <ClerkProvider localization={locale === "ru" ? ruRU : enUS} appearance={{ variables: { colorPrimary: "#1f5f5b", borderRadius: "12px" } }}>
      <html lang={locale} className={`${body.variable} ${display.variable}`}>
        <body className="flex flex-col">
          <Header locale={locale} t={t} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 pt-8 sm:px-8">{children}</main>
          <footer className="no-print border-t border-line px-5 py-8 text-center text-xs text-muted">{t.footer}</footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
