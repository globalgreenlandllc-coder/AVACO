"use client";
/**
 * The link to put in each ad, so Admin → Statistics can tell the platforms and campaigns apart. Meta and TikTok fill
 * in the platform, campaign and ad names themselves when their "URL parameters" field gets these placeholders.
 */
import { useState } from "react";

type Kind = "meta" | "tiktok" | "x" | "organic";
const PRESETS: Record<Kind, { label: string; params: (campaign: string, platform: string) => string; note: string }> = {
  meta: {
    label: "Facebook & Instagram ads (Meta)",
    params: () => "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
    note: "In Ads Manager, paste the parameters into the ad's \"URL parameters\" field and use the plain address as the website. Meta fills in fb or ig, so Facebook and Instagram are counted apart, with each campaign and ad by name.",
  },
  tiktok: {
    label: "TikTok ads",
    params: () => "utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__",
    note: "In TikTok Ads Manager, paste the parameters into \"URL parameters\" (or add them to the destination URL). TikTok fills in the campaign and ad names.",
  },
  x: {
    label: "X (Twitter) ads",
    params: (campaign) => `utm_source=x&utm_medium=paid&utm_campaign=${campaign || "campaign-name"}`,
    note: "X doesn't fill names in: type the campaign's name above, and use this full link as the ad's website URL.",
  },
  organic: {
    label: "Posts, stories and bio links (not paid)",
    params: (campaign, platform) => `utm_source=${platform}&utm_medium=social&utm_campaign=${campaign || "post-name"}`,
    note: "For your own posts and profile links: these count as organic, apart from the ads.",
  },
};
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function TrackingLinks({ origin }: { origin: string }) {
  const [kind, setKind] = useState<Kind>("meta");
  const [campaign, setCampaign] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [page, setPage] = useState("/");
  const [copied, setCopied] = useState<string | null>(null);
  const preset = PRESETS[kind];
  const params = preset.params(slug(campaign), platform);
  const base = `${origin.replace(/\/$/, "")}${page}`;
  const full = `${base}?${params}`;
  const copy = async (text: string, which: string) => { try { await navigator.clipboard.writeText(text); setCopied(which); setTimeout(() => setCopied(null), 1600); } catch { /* select and copy by hand */ } };

  return (
    <section className="card p-7">
      <h2 className="text-lg font-semibold">Links for your ads</h2>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">Use these in every ad and post, so the platforms above, and each campaign, are told apart.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {(Object.keys(PRESETS) as Kind[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`pill text-sm ${kind === k ? "pill-on" : "pill-off"}`}>{PRESETS[k].label}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-sm"><span className="text-xs font-semibold uppercase tracking-widest text-muted">Page it opens</span>
          <select value={page} onChange={(e) => setPage(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2">
            <option value="/">Home page</option><option value="/record">Straight to recording</option><option value="/gift">Gift a report</option>
          </select>
        </label>
        {(kind === "x" || kind === "organic") && (
          <label className="text-sm"><span className="text-xs font-semibold uppercase tracking-widest text-muted">Campaign name</span>
            <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="october-launch" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2" />
          </label>
        )}
        {kind === "organic" && (
          <label className="text-sm"><span className="text-xs font-semibold uppercase tracking-widest text-muted">Platform</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2">
              <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option><option value="x">X (Twitter)</option>
            </select>
          </label>
        )}
      </div>
      <div className="mt-5 space-y-3">
        {(kind === "meta" || kind === "tiktok") && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Website address</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-track px-3 py-2 text-sm">{base}</code><button type="button" className="btn btn-quiet !px-4 !py-2 text-sm" onClick={() => copy(base, "base")}>{copied === "base" ? "Copied" : "Copy"}</button></div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">URL parameters</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-track px-3 py-2 text-sm">{params}</code><button type="button" className="btn !px-4 !py-2 text-sm" onClick={() => copy(params, "params")}>{copied === "params" ? "Copied" : "Copy"}</button></div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">{kind === "meta" || kind === "tiktok" ? "Or the full link in one" : "Link"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-track px-3 py-2 text-sm">{full}</code><button type="button" className={`btn !px-4 !py-2 text-sm ${kind === "meta" || kind === "tiktok" ? "btn-quiet" : ""}`} onClick={() => copy(full, "full")}>{copied === "full" ? "Copied" : "Copy"}</button></div>
        </div>
        <p className="text-xs leading-relaxed text-ink-2">{preset.note}</p>
      </div>
    </section>
  );
}
