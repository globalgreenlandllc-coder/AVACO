import { describe, expect, it } from "vitest";
import { inAppBrowser, openInChromeUrl } from "@/lib/in-app";

describe("social apps' built-in browsers", () => {
  it("names the app, and tells Android from iPhone", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0]")).toEqual({ app: "Facebook", android: false });
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Instagram 305.0.0.0")).toEqual({ app: "Instagram", android: false });
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]")).toEqual({ app: "Facebook", android: true });
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6")).toEqual({ app: "TikTok", android: true });
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Twitter for iPhone/10.0")).toEqual({ app: "X", android: false });
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36")).toEqual({ app: null, android: true });
  });

  it("leaves real browsers alone", () => {
    expect(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBeNull();
    expect(inAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36")).toBeNull();
    expect(inAppBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/129.0 Safari/537.36")).toBeNull();
    expect(inAppBrowser(null)).toBeNull();
  });

  it("builds a link that opens the page in Chrome", () => {
    const url = openInChromeUrl("https://www.avocousa.us/sign-up?redirect_url=%2Frecord");
    expect(url.startsWith("intent://www.avocousa.us/sign-up?redirect_url=%2Frecord#Intent;scheme=https;package=com.android.chrome;")).toBe(true);
    expect(url).toContain("S.browser_fallback_url=https%3A%2F%2Fwww.avocousa.us%2Fsign-up");
  });
});
