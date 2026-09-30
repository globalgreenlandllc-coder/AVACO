import { describe, expect, it } from "vitest";
import { consentFor, consentModeScript, formatConsent, parseConsent } from "@/lib/consent";

describe("cookie consent", () => {
  it("reads and writes the saved choice", () => {
    expect(parseConsent("a1.m0")).toEqual({ analytics: true, ads: false });
    expect(parseConsent(formatConsent({ analytics: false, ads: true }))).toEqual({ analytics: false, ads: true });
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });

  it("asks first in the EEA, UK and Switzerland, and not elsewhere", () => {
    expect(consentFor({ saved: null, country: "DE", gpc: false })).toEqual({ consent: { analytics: false, ads: false }, ask: true, gpc: false });
    expect(consentFor({ saved: null, country: "GB", gpc: false }).ask).toBe(true);
    expect(consentFor({ saved: null, country: "US", gpc: false })).toEqual({ consent: { analytics: true, ads: true }, ask: false, gpc: false });
    expect(consentFor({ saved: null, country: null, gpc: false }).ask).toBe(false);
  });

  it("keeps a saved choice, and lets Global Privacy Control refuse advertising", () => {
    expect(consentFor({ saved: { analytics: true, ads: true }, country: "FR", gpc: false })).toEqual({ consent: { analytics: true, ads: true }, ask: false, gpc: false });
    expect(consentFor({ saved: null, country: "US", gpc: true }).consent).toEqual({ analytics: true, ads: false });
    expect(consentFor({ saved: { analytics: true, ads: true }, country: "US", gpc: true }).consent.ads).toBe(false);
  });

  it("tells Google's Consent Mode before Tag Manager starts", () => {
    const s = consentModeScript({ analytics: true, ads: false });
    expect(s).toContain("gtag('consent','default'");
    expect(s).toContain("ad_storage:'denied'");
    expect(s).toContain("analytics_storage:'granted'");
  });
});
