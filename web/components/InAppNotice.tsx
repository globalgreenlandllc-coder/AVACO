/**
 * On the sign-in pages inside a social app's own browser: say that Google sign-in can't work here (Google blocks it in
 * those browsers), point to email, and offer the phone's real browser for anyone who prefers Google.
 */
import type { Dict } from "@/lib/i18n";
import { openInChromeUrl, type InApp } from "@/lib/in-app";

export function InAppNotice({ inApp, url, t }: { inApp: InApp; url: string; t: Dict["inApp"] }) {
  const app = inApp.app ?? t.anApp;
  return (
    <div className="max-w-sm rounded-2xl border border-line bg-surface px-5 py-4 text-sm leading-relaxed" role="note">
      <p className="font-semibold">{t.title.replace("{app}", app)}</p>
      <p className="mt-1 text-ink-2">{t.email.replace("{app}", app)}</p>
      <p className="mt-2 text-xs text-muted">
        {t.preferGoogle}{" "}
        {inApp.android
          ? <a href={openInChromeUrl(url)} className="font-semibold text-accent-text hover:underline">{t.openAndroid}</a>
          : <span>{t.openIos}</span>}
      </p>
    </div>
  );
}
