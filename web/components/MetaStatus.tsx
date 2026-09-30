/** Admin → Settings: what Meta itself reports about the pixel (lib/meta-capi.ts pixelStatus), read with the server's token. */
import { AD_ACCOUNT_ID, type PixelStatus } from "@/lib/meta-capi";

const ago = (iso: string, now: number) => {
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

export function MetaStatus({ status, now }: { status: PixelStatus; now: number }) {
  if (!status.ok && status.readable === false) return <p className="rounded-xl border border-line px-4 py-3 text-sm text-ink-2">{status.message}</p>;
  if (!status.ok) return <p className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">Meta wouldn&apos;t say: {status.message}</p>;
  const linked = status.accounts?.some((a) => a.id === AD_ACCOUNT_ID);
  const row = (label: string, value: React.ReactNode, good: boolean | null) => (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <span className="text-ink-2">{label}</span>
      <span className={`font-medium ${good === true ? "text-accent-text" : good === false ? "text-danger" : "text-ink"}`}>{value}</span>
    </li>
  );
  return (
    <div>
      <p className="eyebrow mb-2">What Meta reports</p>
      <ul className="divide-y divide-line text-sm">
        {row("Receiving events", status.lastFired ? `yes · last one ${ago(status.lastFired, now)}` : "no events yet", Boolean(status.lastFired))}
        {row("Last 24 hours", status.events === null ? "Meta wouldn't say" : status.events?.length ? status.events.map((e) => `${e.event} ${e.count}`).join(" · ") : "nothing yet", status.events === null ? null : Boolean(status.events?.length))}
        {row(`Ad account Avoco (${AD_ACCOUNT_ID})`, status.accounts === null ? "Meta wouldn't say with this token" : linked ? "connected" : status.accounts?.length ? `not connected (connected: ${status.accounts.map((a) => a.name || a.id).join(", ")})` : "not connected", status.accounts === null ? null : Boolean(linked))}
        {row("Automatic advanced matching", status.automaticMatching === null ? "unknown" : status.automaticMatching ? "on (turn off, or the privacy policy must say so)" : "off", status.automaticMatching === null ? null : !status.automaticMatching)}
        {status.business && row("Business", status.business, null)}
      </ul>
    </div>
  );
}
