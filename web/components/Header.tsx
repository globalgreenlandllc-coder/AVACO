import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import type { Dict, Locale } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

export function Header({ locale, t }: { locale: Locale; t: Dict }) {
  return (
    <header className="no-print mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-6 sm:px-8">
      <Link href="/" className="font-display text-2xl font-semibold tracking-[0.14em]">{t.brand}</Link>
      <nav className="flex items-center gap-3 text-sm sm:gap-6">
        <Show when="signed-in">
          <Link href="/record" className="hidden text-ink-2 hover:text-ink sm:inline">{t.nav.record}</Link>
          <Link href="/reports" className="text-ink-2 hover:text-ink">{t.nav.reports}</Link>
          <Link href="/w" className="text-ink-2 hover:text-ink">{t.org.nav}</Link>
        </Show>
        <LanguageSwitch locale={locale} label={t.language} />
        <Show when="signed-in"><UserButton /></Show>
        <Show when="signed-out"><Link href="/sign-in" className="font-semibold text-accent-text">{t.nav.signIn}</Link></Show>
      </nav>
    </header>
  );
}
