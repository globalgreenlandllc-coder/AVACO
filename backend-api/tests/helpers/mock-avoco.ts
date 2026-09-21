/** A real HTTP server that behaves like AVOCO v2.4, so the client is tested over the wire. */
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface AnalyzeCall {
  path: string;
  channel: string | null;
  token: string;
  fields: Record<string, string>;
  fileBytes: number;
}

export const PSY_TYPES = [
  { id: 1, name: "organizer", value: 49.99 },
  { id: 2, name: "driver", value: 68.64 },
  { id: 6, name: "analyst", value: 12.3 },
  { id: 99, name: "brand_new_type", value: 30 },
];
export const EMO_SCALES = [
  { id: 10, name: "self_control", value: 83.6 },
  { id: 1, name: "energy_level", value: 41.4 },
  { id: 77, name: "brand_new_scale", value: 5.5 },
];

export class MockAvoco {
  logins = 0;
  refreshes = 0;
  analyzeCalls: AnalyzeCall[] = [];
  /** Tokens are valid until revoked. */
  private validTokens = new Set<string>();
  private issued = 0;
  private server: Server | null = null;

  expiresIn = 900;
  refreshFails = false;
  loginFails = false;
  /** Every analysis call gets 401, whatever the token. */
  alwaysUnauthorized = false;
  /** Force this status (with this body) on analysis calls. */
  analyzeError: { status: number; body: unknown } | null = null;

  get url() {
    return `http://127.0.0.1:${(this.server!.address() as AddressInfo).port}`;
  }

  revokeAllTokens() { this.validTokens.clear(); }

  reset() {
    this.logins = this.refreshes = this.issued = 0;
    this.analyzeCalls = [];
    this.validTokens.clear();
    this.expiresIn = 900;
    this.refreshFails = this.loginFails = this.alwaysUnauthorized = false;
    this.analyzeError = null;
  }

  async start() {
    this.server = createServer((req, res) => {
      this.handle(req).then(({ status, body }) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
  }

  async stop() {
    await new Promise((resolve) => this.server?.close(resolve));
  }

  private issue() {
    const token = `access-${++this.issued}`;
    this.validTokens.add(token);
    return token;
  }

  private async handle(req: IncomingMessage): Promise<{ status: number; body: unknown }> {
    const url = new URL(req.url ?? "/", "http://mock");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);

    if (url.pathname === "/api/v2/auth/login") {
      this.logins++;
      const { username, password } = JSON.parse(raw.toString());
      if (this.loginFails || username !== "api_demo" || password !== "pw") return { status: 401, body: { detail: "Bad credentials" } };
      return { status: 200, body: { access_token: this.issue(), refresh_token: "refresh-1", token_type: "bearer", expires_in: this.expiresIn } };
    }

    if (url.pathname === "/api/v2/auth/refresh") {
      this.refreshes++;
      if (this.refreshFails) return { status: 401, body: { detail: "Refresh token expired" } };
      return { status: 200, body: { access_token: this.issue(), token_type: "bearer", expires_in: this.expiresIn } };
    }

    const match = url.pathname.match(/^\/api\/v2\/analyze\/(psytype|emostate)(\/callback)?$/);
    if (!match) return { status: 404, body: { detail: "Not found" } };

    const form = await new Request("http://mock", { method: "POST", headers: { "content-type": req.headers["content-type"]! }, body: raw }).formData();
    const file = form.get("file");
    const fields: Record<string, string> = {};
    for (const [name, value] of form) if (typeof value === "string") fields[name] = value;
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    this.analyzeCalls.push({ path: url.pathname, channel: url.searchParams.get("channel"), token, fields, fileBytes: file instanceof File ? file.size : 0 });

    if (this.alwaysUnauthorized || !this.validTokens.has(token)) return { status: 401, body: { detail: "Token expired" } };
    if (this.analyzeError) return this.analyzeError;
    if (match[2]) return { status: 202, body: { id: fields.id, status: "accepted", message: "Queued" } };
    return { status: 200, body: match[1] === "psytype" ? { psy_types: PSY_TYPES } : { emo_scales: EMO_SCALES } };
  }
}
