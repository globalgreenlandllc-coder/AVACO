import { Recorder } from "@/components/Recorder";
import { getDict } from "@/lib/i18n";

export default async function RecordPage() {
  const { t } = await getDict();
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-display text-5xl font-medium">{t.record.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{t.record.lead}</p>
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
