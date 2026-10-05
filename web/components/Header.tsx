import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { showAdminLink } from "@/lib/admin";
import type { Dict, Locale } from "@/lib/i18n";
import { isPartnerHost } from "@/lib/partners";
import { availableLanguages } from "@/lib/translate";
import { isOpenHost } from "@/lib/visitor";
import { HeaderShell } from "./HeaderShell";
import { LanguageSwitch } from "./LanguageSwitch";

// Links into a section of the landing page are plain anchors: the client-side link changes the address but does not scroll to the section.
const link = "whitespace-nowrap rounded-full px-3 py-1.5 text-ink-2 transition-colors hover:bg-track/70 hover:text-ink";

/**
 * The header, fixed to the top of every page. On a phone only what matters fits beside the brand: reports (with the
 * count of couple's reports waiting), the language and the account; the rest of the links come back from tablets up,
 * and every one of them is on the landing page too.
 */
export async function Header({ locale, t, alerts = 0 }: { locale: Locale; t: Dict; alerts?: number }) {
  const [languages, partner, open] = await Promise.all([availableLanguages(), isPartnerHost(), isOpenHost()]);
  const admin = partner || open ? false : await showAdminLink();
  const lang = <LanguageSwitch locale={locale} label={t.language} languages={languages.map(({ code, name, flag }) => ({ code, name, flag }))} />;
  const badge = alerts > 0 && <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 align-middle text-[11px] font-bold text-accent-ink" aria-label={`${alerts}`}>{alerts}</span>;
  return (
    <HeaderShell>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <Link href="/" className="font-display text-2xl font-semibold tracking-[0.14em] transition-opacity hover:opacity-80">{t.brand}</Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {/* The partner host has no accounts: just the language menu. The open host has the original links, no sign-in. */}
          {partner ? lang : open ? <>
            <Link href="/record" className={`hidden sm:inline ${link}`}>{t.nav.record}</Link>
            <Link href="/reports" className={link}>{t.nav.reports}{badge}</Link>
            {lang}
          </> : <>
          <Show when="signed-in">
            <Link href="/record" className={`hidden sm:inline ${link}`}>{t.nav.record}</Link>
            <Link href="/reports" className={link}>{t.nav.reports}{badge}</Link>
            <Link href="/w" className={`hidden md:inline ${link}`}>{t.org.nav}</Link>
            <Link href="/credits" className={`hidden md:inline ${link}`}>{t.billing.nav}</Link>
            <a href="/#gift" className={`hidden sm:inline ${link}`}>{t.gift.nav}</a>
            {admin && <Link href="/admin" className="ml-1 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-ink transition-opacity hover:opacity-90">Admin</Link>}
          </Show>
          <Show when="signed-out">
            <a href="/#gift" className={`hidden sm:inline ${link}`}>{t.gift.nav}</a>
            <Link href="/sample" className={`hidden md:inline ${link}`}>{t.nav.sample}</Link>
          </Show>
          <span className="ml-1">{lang}</span>
          <Show when="signed-in"><span className="ml-1 flex items-center">< UserButton /></span></Show>
          <Show when="signed-out"><Link href="/sign-in" className="ml-1 rounded-full border border-accent px-4 py-1.5 font-semibold text-accent-text transition-colors hover:bg-accent hover:text-accent-ink">{t.nav.signIn}</Link></Show>
          </>}
        </nav>
      </header>
    </HeaderShell>
  );
}
