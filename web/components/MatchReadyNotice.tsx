import type { Dict } from "@/lib/i18n";
import type { Match } from "@/lib/matches";
import { matchWords, type KindWords, type MatchKind } from "@/lib/match-kind";
import { ReadyNotice } from "./ReadyNotice";

/**
 * "Your couple's report with Serge is ready": shown at the top of every page from the moment the partner's voice is
 * analysed until the orderer opens the report (the match page marks it seen). "Later" hides it for the browser session.
 */
export function MatchReadyNotice({ matches, t, kinds }: { matches: Match[]; t: Dict["match"]; kinds: Record<MatchKind, KindWords> }) {
  if (matches.length === 0) return null;
  const items = matches.map((m) => ({ id: m.id, href: `/match/${m.id}`, text: matchWords(t, m.kind, kinds).notice.ready.replace("{name}", m.partnerName), open: t.notice.open }));
  return <ReadyNotice items={items} later={t.notice.later} />;
}
