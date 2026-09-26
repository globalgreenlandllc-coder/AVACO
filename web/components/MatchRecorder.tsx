"use client";

import { Recorder, type RecorderProps } from "./Recorder";

/** The partner's recorder: the moment they press record or choose a file, the orderer's tracker learns it. */
export function MatchRecorder({ startedUrl, ...props }: RecorderProps & { startedUrl: string }) {
  return <Recorder {...props} onStart={() => { void fetch(startedUrl, { method: "POST" }).catch(() => {}); }} />;
}
