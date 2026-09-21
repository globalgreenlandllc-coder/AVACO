"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { AudioError, toAnalysisWav } from "@/lib/wav";

type Channel = "mix" | "left" | "right";

/** Existing recordings, one person per file. Each file is converted in the browser, uploaded and sent for analysis in turn. */
export function BulkUpload({ groupId, t, errors }: { groupId: string; t: Dict["org"]["group"]; errors: Dict["record"]["errors"] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [channel, setChannel] = useState<Channel>("mix");
  const [attest, setAttest] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  async function run() {
    setFailed([]);
    setProgress({ done: 0, total: files.length });
    const problems: string[] = [];
    for (const [i, file] of files.entries()) {
      const name = file.name.replace(/\.[^.]+$/, "");
      try {
        const { wav } = await toAnalysisWav(file, channel === "mix" ? undefined : channel === "left" ? 0 : 1);
        const stored = await upload(`upload-${Date.now()}.wav`, wav, { access: "public", handleUploadUrl: `/api/w/groups/${groupId}/upload-token`, contentType: "audio/wav" });
        const res = await fetch(`/api/w/groups/${groupId}/uploads`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, audioUrl: stored.url, attest: true }) });
        if (!res.ok) throw new Error(String(res.status));
      } catch (err) {
        problems.push(`${file.name}: ${err instanceof AudioError ? errors[err.problem] : errors.failed}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setFailed(problems);
    setFiles([]);
    setProgress(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input type="file" accept="audio/*,video/*,.opus,.m4a,.mov,.mp4,.webm" multiple disabled={progress !== null} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="block w-full text-sm text-ink-2 file:mr-4 file:rounded-full file:border file:border-line file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink" />
      <div role="radiogroup" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
        {(["mix", "left", "right"] as const).map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} className="accent-[var(--accent)]" /> {t.channel[c]}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
        <span>{t.attest}</span>
      </label>
      <button type="button" className="btn" disabled={files.length === 0 || !attest || progress !== null} onClick={run}>
        {progress ? t.uploading.replace("{done}", String(progress.done)).replace("{total}", String(progress.total)) : t.uploadGo}
      </button>
      {failed.length > 0 && <ul role="alert" className="space-y-1 text-sm text-danger">{failed.map((f) => <li key={f}>{f}</li>)}</ul>}
    </div>
  );
}
