/** A group's open link, and station mode (?station=1): the visitor types their name and goes on to record. */
import { getDict } from "@/lib/i18n";
import { groupByOpenToken } from "@/lib/workspaces";
import { enterOpenLinkAction } from "../../w/actions";

export const metadata = { robots: { index: false, follow: false } };

export default async function OpenLinkPage({ params, searchParams }: { params: Promise<{ open: string }>; searchParams: Promise<{ station?: string }> }) {
  const [{ open }, { station }, { t }] = await Promise.all([params, searchParams, getDict()]);
  const found = await groupByOpenToken(open);
  const r = t.org.record;
  if (!found) return <p className="card mx-auto mt-10 max-w-lg p-10 text-center text-ink-2">{r.invalid}</p>;

  return (
    <div className="mx-auto max-w-lg pt-6">
      <p className="eyebrow">{found.group.name}</p>
      <h1 className="mt-3 font-display text-5xl font-medium">{found.ws.name}</h1>
      <p className="mt-4 leading-relaxed text-ink-2">{r.from.replace("{company}", found.ws.name)} {r.what.replaceAll("{company}", found.ws.name)}</p>
      <form action={enterOpenLinkAction} className="card mt-8 space-y-4 p-7">
        <input type="hidden" name="open" value={open} />
        {station && <input type="hidden" name="station" value="1" />}
        <label className="block text-sm"><span className="text-ink-2">{r.yourName}</span>
          <input name="name" required maxLength={120} autoComplete="off" autoFocus className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-3 text-lg" /></label>
        <button type="submit" className="btn w-full">{r.start}</button>
      </form>
    </div>
  );
}
