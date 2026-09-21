"use client";

import { useState, useTransition } from "react";
import { rotateApiKeyAction } from "@/app/w/actions";
import { CopyField } from "./CopyField";

export function ApiKeyBox({ wsId, hasKey, labels }: { wsId: string; hasKey: boolean; labels: { create: string; replace: string; shown: string; copy: string; copied: string } }) {
  const [key, setKey] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {key && (
        <div className="rounded-xl border border-accent/50 p-4">
          <p className="mb-2 text-sm">{labels.shown}</p>
          <CopyField value={key} copy={labels.copy} copied={labels.copied} />
        </div>
      )}
      <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => start(async () => setKey(await rotateApiKeyAction(wsId)))}>
        {hasKey || key ? labels.replace : labels.create}
      </button>
    </div>
  );
}
