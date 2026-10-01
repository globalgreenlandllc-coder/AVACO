/**
 * Loads the rows behind Admin → Statistics, "Recordings" (lib/recording-math.ts): the gateway's analyses of the last 30
 * days from the shared database, what each one opened (report_access), whose voice it was (report_people), the match an
 * invited partner belongs to, and each account's first tracked visit. Admins' own recordings, and their partners'
 * recordings, are left out and counted. Reads across every user: callers check requireAdmin() first. Server only.
 */
import "server-only";
import { sql } from "drizzle-orm";
import { isAdminUser } from "./admin";
import { db } from "./db";
import { userLabels } from "./page";
import { summarizeRecordings, type Door, type Outcome, type RecordingKind, type RecordingRow, type RecordingStats } from "./recording-math";
import { isPaidVisit } from "./visits-math";

const rowsOf = <T,>(result: unknown) => ((result as { rows?: T[] }).rows ?? []);

interface Raw {
  id: string; owner: string; status: string; error: string | null; created_at: string | Date; psytype: Array<{ key: string; label?: string; value: number }> | null;
  access: string | null; person: string | null; match_owner: string | null; match_kind: string | null;
}
interface RawDoor {
  user_id: string; source: string | null; medium: string | null; click: string | null; campaign: string | null; content: string | null; term: string | null;
  country: string | null; region: string | null; city: string | null; device: string | null;
}

export async function recordingStatistics(now = new Date()): Promise<RecordingStats & { leftOut: number }> {
  const raw = rowsOf<Raw>(await db().execute(sql`
    select a.id, a.external_user_id as owner, a.status, a.error, a.created_at, a.psytype,
      ra.source as access, rp.name as person, m.owner_id as match_owner, m.kind as match_kind
    from analyses a
    left join report_access ra on ra.analysis_id = a.id
    left join report_people rp on rp.analysis_id = a.id
    left join matches m on a.external_user_id = 'm:' || m.id::text
    where a.created_at > ${new Date(now.getTime() - 30 * 86_400_000)}
    order by a.created_at desc`));

  const accountOf = (r: Raw) => (r.owner.startsWith("user_") ? r.owner : r.match_owner?.startsWith("user_") ? r.match_owner : null);
  const accounts = [...new Set(raw.map(accountOf).filter((u): u is string => Boolean(u)))];
  const admins = new Set((await Promise.all(accounts.map(async (u) => ((await isAdminUser(u)) ? u : null)))).filter((u): u is string => Boolean(u)));
  const kept = raw.filter((r) => { const a = accountOf(r); return !a || !admins.has(a); });
  const people = accounts.filter((u) => !admins.has(u));

  // Each account's first tracked visit: the door it came in through, with its ad and place.
  const doors = new Map<string, Door>();
  if (people.length) {
    const found = rowsOf<RawDoor>(await db().execute(sql`
      with b as (select distinct visitor, user_id from visits where user_id in (${sql.join(people.map((p) => sql`${p}`), sql`, `)}))
      select distinct on (b.user_id) b.user_id, x.source, x.medium, x.click, x.campaign, x.content, x.term, x.country, x.region, x.city, x.device
      from b join visits x on x.visitor = b.visitor and x.landing
      order by b.user_id, x.at asc`));
    for (const d of found) {
      doors.set(d.user_id, {
        source: d.source ?? "direct", paid: isPaidVisit({ medium: d.medium, click: d.click }),
        campaign: d.campaign, content: d.content, term: d.term, country: d.country, region: d.region, city: d.city, device: d.device,
      });
    }
  }
  const labels = await userLabels(people.slice(0, 100));

  const rows: RecordingRow[] = kept.map((r) => {
    const kind: RecordingKind = r.owner.startsWith("user_") ? (r.person ? "someone" : "own") : r.owner.startsWith("m:") ? "partner" : r.owner.startsWith("g:") ? "company" : r.owner === "partners" ? "partner-page" : "open";
    const leader = r.status === "completed" && r.psytype?.length ? r.psytype.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const outcome: Outcome = r.status === "failed" ? "failed" : r.status !== "completed" ? "waiting"
      : kind === "own" || kind === "someone"
        ? r.access === "welcome" ? "free" : r.access === "credit" ? "paid" : r.access === "admin" ? "admin" : r.access === "free" ? "billing-off" : "preview"
        : "included";
    const account = accountOf(r);
    return {
      id: r.id, at: new Date(r.created_at), status: r.status, error: r.error, kind,
      leader: leader ? { key: leader.key, label: leader.label ?? leader.key, value: leader.value } : null,
      outcome, matchKind: r.match_kind, who: account ? labels.get(account) ?? account : null, door: account ? doors.get(account) ?? null : null,
    };
  });
  return { ...summarizeRecordings(rows, now), leftOut: raw.length - kept.length };
}
