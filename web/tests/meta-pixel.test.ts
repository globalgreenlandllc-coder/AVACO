import { afterEach, describe, expect, it, vi } from "vitest";
import { META_PIXEL_ID, metaEventFor, metaPixelScript, sendToMeta } from "@/lib/meta-pixel";

afterEach(() => { vi.unstubAllGlobals(); });

describe("Meta's pixel", () => {
  it("loads with automatic configuration off, then sends the page view", () => {
    const code = metaPixelScript(META_PIXEL_ID);
    expect(code).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(code).toContain(`fbq('set','autoConfig',false,'${META_PIXEL_ID}')`);
    expect(code.indexOf("autoConfig")).toBeLessThan(code.indexOf("fbq('init'"));
    expect(code).toContain("fbq('track','PageView')");
    expect(metaPixelScript("1');alert(1);//")).toBe(""); // only digits reach the page
  });

  it("names our events as Meta does", () => {
    expect(metaEventFor("sign_up", { event_id: "signup_1" })).toMatchObject({ name: "CompleteRegistration", custom: false });
    expect(metaEventFor("record_voice", { event_id: "record_1" })).toMatchObject({ name: "RecordVoice", custom: true });
    expect(metaEventFor("free_report", { event_id: "free_1" })).toMatchObject({ name: "StartTrial", custom: false });
    expect(metaEventFor("begin_checkout", { event_id: "c1", item: "report" })).toMatchObject({ name: "InitiateCheckout", data: { content_name: "report" } });
    expect(metaEventFor("purchase", { event_id: "p1", value: 9, currency: "usd", item: "report" })).toMatchObject({ name: "Purchase", data: { value: 9, currency: "USD", content_name: "report" } });
    expect(metaEventFor("something_else", { event_id: "x" })).toBeNull();
  });

  it("sends each event once with our event id, so a server-side copy counts once too", () => {
    const fbq = vi.fn();
    vi.stubGlobal("window", { fbq });
    sendToMeta("purchase", { event_id: "purchase_abc", value: 9, currency: "usd", item: "report" });
    sendToMeta("record_voice", { event_id: "record_xyz" });
    expect(fbq).toHaveBeenNthCalledWith(1, "track", "Purchase", { value: 9, currency: "USD", content_name: "report", content_type: "product" }, { eventID: "purchase_abc" });
    expect(fbq).toHaveBeenNthCalledWith(2, "trackCustom", "RecordVoice", {}, { eventID: "record_xyz" });
  });

  it("does nothing where the pixel isn't on the page", () => {
    vi.stubGlobal("window", {});
    expect(() => sendToMeta("sign_up", { event_id: "signup_1" })).not.toThrow();
  });
});
