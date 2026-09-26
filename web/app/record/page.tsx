import { auth } from "@clerk/nextjs/server";
import { Recorder } from "@/components/Recorder";
import { activeGift } from "@/lib/gifts";
import { getDict } from "@/lib/i18n";

export default async function RecordPage() {
  const [{ t }, { userId }] = await Promise.all([getDict(), auth()]);
  // Someone holding a gift: say so, and that the report opens by itself.
  const gift = userId ? await activeGift(userId).catch(() => null) : null;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-display text-5xl font-medium">{t.record.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{t.record.lead}</p>
        {gift && (
          <div className="mt-6 rounded-2xl border border-accent bg-accent-soft px-5 py-4">
            <p className="font-semibold">🎁 {t.gift.record.title.replace("{giver}", gift.giverName)}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.gift.record.text} {t.gift.record.left.replace("{n}", String(gift.reports - gift.reportsUsed))}.</p>
          </div>
        )}
        <div className="mt-8"><Recorder t={t.record} payText={t.billing.cap} /></div>
      </div>
      <aside className="lg:pt-32">
        <p className="eyebrow">{t.record.promptsTitle}</p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
          {t.record.prompts.map((prompt) => <li key={prompt} className="border-l border-line pl-4">{prompt}</li>)}
        </ul>
      </aside>
    </div>
  );
}
