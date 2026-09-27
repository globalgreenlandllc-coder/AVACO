/**
 * The email that carries a person's report as a file: what is attached, where the report lives on the site, and why
 * the mail was sent. Pure, so it can be tested; the sending is in app/api/analyses/[id]/email.
 */
import type { Dict } from "./i18n";

export interface ReportMailData {
  /** The recording's date, already in the reader's language. */
  date: string;
  /** What the file holds, in order: "Type report", "Industry chapter · Automotive", … */
  pieces: string[];
  /** The report's page on the site. */
  url: string;
  to: string;
}

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const C = { page: "#f3ede1", card: "#fffdf8", cover: "#1c150d", coverInk: "#f5eee0", coverMuted: "#b7a98f", gold: "#e2a647", goldInk: "#2a1c05", ink: "#2a2116", ink2: "#5a4f40", muted: "#8a7d68", line: "#e6dcc6" };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function renderReportMail(d: ReportMailData, t: Dict["report"]["mail"], locale: string): { subject: string; html: string; text: string } {
  const subject = fill(t.subject, { date: d.date });
  const lead = fill(t.lead, { date: d.date });
  const why = fill(t.why, { to: d.to });
  const items = d.pieces.map((p) => `<li style="margin:0 0 6px;font:15px/1.5 ${SANS};color:${C.ink};">${esc(p)}</li>`).join("");

  const html = `<!doctype html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(lead)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:${C.cover};padding:30px 32px 28px;">
              <div style="font:700 13px/1 ${SANS};letter-spacing:0.32em;color:${C.gold};">AVOCO</div>
              <div style="margin-top:22px;font:12px/1 ${SANS};letter-spacing:0.18em;text-transform:uppercase;color:${C.coverMuted};">${esc(t.title)}</div>
              <div style="margin-top:10px;font:500 34px/1.15 ${SERIF};color:${C.coverInk};">${esc(d.date)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px 8px;">
              <div style="font:15px/1.55 ${SANS};color:${C.ink};">${esc(lead)}</div>
              <div style="margin-top:22px;font:12px/1 ${SANS};letter-spacing:0.16em;text-transform:uppercase;color:${C.muted};">${esc(t.contains)}</div>
              <ul style="margin:10px 0 0;padding:0 0 0 20px;">${items}</ul>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 8px;">
              <a href="${esc(d.url)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:${C.gold};color:${C.goldInk};font:700 14px/1 ${SANS};text-decoration:none;">${esc(t.open)}</a>
              <div style="margin-top:16px;font:13px/1.55 ${SANS};color:${C.ink2};">${esc(t.keep)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${C.line};">
              <div style="font:12px/1.55 ${SANS};color:${C.muted};">${esc(why)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [t.title, d.date, "", lead, "", `${t.contains}:`, ...d.pieces.map((p) => `- ${p}`), "", `${t.open}: ${d.url}`, t.keep, "", why].join("\n");
  return { subject, html, text };
}
