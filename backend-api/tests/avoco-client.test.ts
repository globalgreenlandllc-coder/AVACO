import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AvocoApiError, AvocoClient } from "@/lib/avoco";
import { MockAvoco } from "./helpers/mock-avoco";

const mock = new MockAvoco();
const audio = { bytes: new Uint8Array(1024), filename: "rec.m4a" };
let client: AvocoClient;

beforeAll(() => mock.start());
afterAll(() => mock.stop());
beforeEach(() => {
  mock.reset();
  client = new AvocoClient("api_demo", "pw", mock.url);
});

describe("token handling", () => {
  it("logs in once and reuses the cached token", async () => {
    expect(await client.getAccessToken()).toBe("access-1");
    expect(await client.getAccessToken()).toBe("access-1");
    expect(mock.logins).toBe(1);
  });

  it("de-duplicates concurrent auth calls", async () => {
    const tokens = await Promise.all(Array.from({ length: 10 }, () => client.getAccessToken()));
    expect(new Set(tokens)).toEqual(new Set(["access-1"]));
    expect(mock.logins).toBe(1);
  });

  it("refreshes 60 s before expiry instead of logging in again", async () => {
    mock.expiresIn = 60; // inside the 60 s margin, so the token counts as expired straight away
    await client.getAccessToken();
    expect(await client.getAccessToken()).toBe("access-2");
    expect(mock).toMatchObject({ logins: 1, refreshes: 1 });
  });

  it("keeps a token that is still outside the 60 s margin", async () => {
    mock.expiresIn = 120;
    await client.getAccessToken();
    await client.getAccessToken();
    expect(mock).toMatchObject({ logins: 1, refreshes: 0 });
  });

  it("falls back to a full login when refresh fails", async () => {
    mock.expiresIn = 60;
    await client.getAccessToken();
    mock.refreshFails = true;
    expect(await client.getAccessToken()).toBe("access-2");
    expect(mock).toMatchObject({ logins: 2, refreshes: 1 });
  });

  it("reports bad credentials as an AvocoApiError", async () => {
    mock.loginFails = true;
    await expect(client.getAccessToken()).rejects.toMatchObject({ name: "AvocoApiError", status: 401 });
  });

  it("reports an unreachable server as status 0", async () => {
    const dead = new AvocoClient("api_demo", "pw", "http://127.0.0.1:1");
    await expect(dead.getAccessToken()).rejects.toMatchObject({ name: "AvocoApiError", status: 0 });
  });
});

describe("analysis calls", () => {
  it("sends the file with a bearer token and the channel", async () => {
    const scales = await client.analyze("psytype", audio, 1);
    expect(scales[0]).toEqual({ id: 1, name: "organizer", value: 49.99 });
    expect(mock.analyzeCalls).toEqual([{ path: "/api/v2/analyze/psytype", channel: "1", token: "access-1", fields: {}, fileBytes: 1024 }]);
  });

  it("on 401 re-authenticates once and retries once", async () => {
    await client.getAccessToken();
    mock.revokeAllTokens();
    const scales = await client.analyze("emostate", audio);
    expect(scales).toHaveLength(3);
    expect(mock.analyzeCalls.map((c) => c.token)).toEqual(["access-1", "access-2"]);
  });

  it("gives up after one retry when 401 persists", async () => {
    mock.alwaysUnauthorized = true;
    await expect(client.analyze("psytype", audio)).rejects.toBeInstanceOf(AvocoApiError);
    expect(mock.analyzeCalls).toHaveLength(2);
  });

  it("submits async jobs with id and callback_url", async () => {
    await client.submitCallback("emostate", audio, { id: "job-1", callbackUrl: "https://x.example/hook?secret=s" }, 0);
    expect(mock.analyzeCalls[0]).toMatchObject({
      path: "/api/v2/analyze/emostate/callback",
      channel: "0",
      fields: { id: "job-1", callback_url: "https://x.example/hook?secret=s" },
      fileBytes: 1024,
    });
  });
});
