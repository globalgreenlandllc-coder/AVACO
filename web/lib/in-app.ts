/**
 * The built-in browsers of social apps (Facebook, Instagram, TikTok, X…), where people land from an ad. Google refuses
 * to sign anyone in inside them ("Error 403: disallowed_useragent"), so the sign-in pages hide "Continue with Google"
 * there and point to email, or to the phone's real browser. Tested in tests/in-app.test.ts.
 */
export interface InApp { app: string | null; android: boolean }

const APPS: Array<[RegExp, string]> = [
  [/Instagram/i, "Instagram"],
  [/MessengerForiOS|FB_IAB\/MESSENGER|\bOrca-Android\b/i, "Messenger"],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/, "Facebook"],
  [/musical_ly|BytedanceWebview|TikTok|trill_/i, "TikTok"],
  [/Twitter/i, "X"],
  [/LinkedInApp/i, "LinkedIn"],
  [/Snapchat/i, "Snapchat"],
  [/Pinterest/i, "Pinterest"],
  [/\bLine\//, "LINE"],
];

/** Which app's built-in browser this is, if any. An Android web view that doesn't name its app still counts (app null). */
export function inAppBrowser(userAgent: string | null | undefined): InApp | null {
  const ua = userAgent ?? "";
  const android = /Android/i.test(ua);
  for (const [re, app] of APPS) if (re.test(ua)) return { app, android };
  if (android && /; wv\)/.test(ua)) return { app: null, android };
  return null;
}

/** An Android link that opens the same page in Chrome (and, without Chrome, in the default browser). */
export function openInChromeUrl(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}
