/**
 * POST /api/analyses/:id/email — mails the person their own report, as the file the browser built (the same one the
 * download button saves), to the address they sign in with. Only the report's owner, only once it is open in full,
 * and never to any other address: the mail leaves from our mailbox, so where it can go is kept narrow.
 *
 *   multipart/form-data: file (text/html, up to 12 MB), pieces (JSON list of what the file holds, for the mail's text)
 *   → 200 { sent: true, to } | 400 too_big / bad_request | 402 payment_required | 404 | 409 no_email | 503 not_configured
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { hasFullAccess } from "@/lib/billing";
import { emailConfig, sendEmail } from "@/lib/email";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { LEGAL } from "@/lib/legal";
import { baseUrl } from "@/lib/page";
import { signInEmail } from "@/lib/receipts";
import { renderReportMail } from "@/lib/report-mail";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_PER_HOUR = 6;
// Per instance: enough to stop a loop from burning the mailbox's daily quota, since the mail only ever goes to the sender.
const recent = new Map<string, number[]>();
function tooMany(userId: string): boolean {
  const now = Date.now();
  const times = (recent.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  recent.set(userId, times);
  if (times.length >= MAX_PER_HOUR) return true;
  times.push(now);
  return false;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const { id } = await ctx.params;
    const analysis = await gateway.getAnalysisFor(user.userId, id);
    if (!analysis || analysis.status !== "completed") return json({ error: "not_found", message: "Report not found" }, 404);
    if (!(await hasFullAccess(user.userId, analysis.id))) return json({ error: "payment_required", message: "Open the full report first" }, 402);
    if (!(await emailConfig())) return json({ error: "not_configured", message: "Email is not set up" }, 503);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.type.startsWith("text/html")) return json({ error: "bad_request", message: "Send the report file" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "too_big", message: "The file is too large to email" }, 400);
    let pieces: string[] = [];
    try { const raw = JSON.parse(String(form?.get("pieces") ?? "[]")); if (Array.isArray(raw)) pieces = raw.filter((p): p is string => typeof p === "string").slice(0, 12).map((p) => p.slice(0, 120)); } catch { /* no list: the mail says so without one */ }

    if (tooMany(user.userId)) return json({ error: "too_many", message: "Try again in an hour" }, 429);
    const to = await signInEmail(user.userId);
    if (!to) return json({ error: "no_email", message: "No verified email on this account" }, 409);

    const [{ t, locale }, origin] = await Promise.all([getDict(), baseUrl()]);
    const date = formatDate(analysis.created_at, locale);
    const mail = renderReportMail({ date, pieces, url: `${origin}/reports/${analysis.id}`, to }, t.report.mail, locale);
    const sent = await sendEmail({
      to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: LEGAL.support,
      attachments: [{ filename: `avoco-report-${analysis.created_at.slice(0, 10)}.html`, content: Buffer.from(await file.arrayBuffer()), contentType: "text/html; charset=utf-8" }],
    });
    return sent ? json({ sent: true, to }) : json({ error: "not_configured", message: "Email is not set up" }, 503);
  } catch (err) {
    return errorResponse(err);
  }
}
