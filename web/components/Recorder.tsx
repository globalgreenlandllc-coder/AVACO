"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { AudioError, MAX_SECONDS, MIN_SECONDS, toAnalysisWav } from "@/lib/wav";
import { Thinking } from "./Thinking";

type Phase = "idle" | "recording" | "recorded" | "sending";
type ErrorKey = keyof Dict["record"]["errors"];

const RING = 2 * Math.PI * 54;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export interface RecorderProps {
  t: Dict["record"];
  /** Where the Blob upload token comes from, where the analysis is started, and where to go afterwards ({id} = analysis id). */
  uploadUrl?: string;
  createUrl?: string;
  doneUrl?: string;
  /** Replaces the default consent sentence (a company's link names the company). */
  consentText?: string;
  /** A second box that must also be ticked, e.g. "18 or older, or a parent agreed". */
  extraConsent?: string;
  /** Shown when the server answers 429 (a company's monthly limit). */
  limitText?: string;
  /** Shown when the server answers 402 (no free previews or credits left). */
  payText?: string;
}

export function Recorder({ t, uploadUrl = "/api/upload-token", createUrl = "/api/analyses", doneUrl = "/reports/{id}", consentText, extraConsent, limitText, payText }: RecorderProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [extra, setExtra] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const agreed = consent && (!extraConsent || extra);
  const [progress, setProgress] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [error, setError] = useState<ErrorKey | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const setRecording = useCallback((blob: Blob | null) => {
    setClip((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return blob ? { blob, url: URL.createObjectURL(blob) } : null;
    });
  }, []);

  useEffect(() => () => { cleanup.current?.(); }, []);

  async function start() {
    setError(null);
    setRecording(null);
    setConsent(false);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch {
      setError("mic");
      return;
    }

    // Level meter: the loudest sample of each frame, smoothed a little.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    const meter = () => {
      analyser.getFloatTimeDomainData(samples);
      const peak = samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
      setLevel((prev) => prev * 0.7 + Math.min(1, peak * 2.2) * 0.3);
      frame = requestAnimationFrame(meter);
    };
    meter();

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      cleanup.current?.();
      // Too short to analyse: say so now, not after an upload.
      if ((Date.now() - startedAt) / 1000 < MIN_SECONDS) {
        setError("tooShort");
        setPhase("idle");
        return;
      }
      setRecording(new Blob(chunks, { type: rec.mimeType }));
      setPhase("recorded");
    };

    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS && rec.state === "recording") rec.stop();
    }, 200);

    cleanup.current = () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
      setLevel(0);
      cleanup.current = null;
    };

    recorder.current = rec;
    rec.start(1000);
    setSeconds(0);
    setPhase("recording");
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function reset() {
    setRecording(null);
    setConsent(false);
    setExtra(false);
    setSeconds(0);
    setError(null);
    setMessage(null);
    setPhase("idle");
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRecording(file);
    setSeconds(0);
    setPhase("recorded");
  }

  async function analyse() {
    if (!clip || !agreed) return;
    setError(null);
    setMessage(null);
    setPhase("sending");
    try {
      setStep(0); setUploaded(0);
      setProgress(t.preparing);
      const { wav } = await toAnalysisWav(clip.blob);

      setStep(1);
      setProgress(t.uploading);
      const stored = await upload(`voice-${Date.now()}.wav`, wav, { access: "public", handleUploadUrl: uploadUrl, contentType: "audio/wav", onUploadProgress: (p) => setUploaded(p.percentage) });

      setStep(2);
      setProgress(t.starting);
      const res = await fetch(createUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ audioUrl: stored.url, consent: true, extraConsent: extraConsent ? true : undefined }) });
      if (res.status === 429 && limitText) { setMessage(limitText); setProgress(null); setPhase("recorded"); return; }
      if (res.status === 402 && (payText || limitText)) { setMessage(payText ?? limitText ?? null); setProgress(null); setPhase("recorded"); return; }
      if (res.status === 502 || res.status === 503) { setError("unavailable"); setProgress(null); setPhase("recorded"); return; }
      if (!res.ok) throw new Error(`analyses ${res.status}`);
      const { id } = await res.json();
      router.push(doneUrl.replace("{id}", id));
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof AudioError ? err.problem : "failed");
      setProgress(null);
      setPhase("recorded");
    }
  }

  const recording = phase === "recording";
  const enough = seconds >= MIN_SECONDS;
  const ring = recording ? Math.min(1, seconds / MIN_SECONDS) : 0;

  return (
    <div className="card p-7 sm:p-10">
      <div className="flex flex-col items-center text-center">
        <div className="relative grid h-44 w-44 place-items-center">
          {recording && <span className="breathe absolute inset-3 rounded-full bg-accent" style={{ scale: String(1 + level * 0.25) }} aria-hidden />}
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--track)" strokeWidth="3" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={RING} strokeDashoffset={RING * (1 - ring)} style={{ transition: "stroke-dashoffset 0.25s linear" }} />
          </svg>
          <button type="button" onClick={recording ? stop : start} disabled={phase === "sending"}
            aria-label={recording ? t.stop : phase === "recorded" ? t.again : t.start}
            className="relative grid h-28 w-28 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition-transform hover:scale-[1.03] disabled:opacity-50">
            {recording
              ? <span className="h-8 w-8 rounded-md bg-current" aria-hidden />
              : <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>}
          </button>
        </div>

        <p className="mt-6 font-display text-5xl tabular-nums" aria-live="off">{clock(seconds)}</p>
        <p className="mt-2 min-h-6 text-sm text-ink-2" aria-live="polite">
          {recording ? (seconds >= MAX_SECONDS ? t.maxReached : enough ? t.ready : t.minimum)
            : phase === "recorded" ? t.recorded
            : phase === "sending" ? progress
            : t.start}
        </p>

        {phase === "idle" && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <label className="btn btn-quiet cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 16V4m0 0-4 4m4-4 4 4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
              {t.upload}
              <input type="file" accept="audio/*,video/*,.opus,.m4a,.mov,.mp4,.webm" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} />
            </label>
            <p className="text-xs text-muted">{t.uploadHint}</p>
          </div>
        )}
      </div>

      {(phase === "recorded" || phase === "sending") && clip && (
        <div className="mt-8 space-y-6 border-t border-line pt-8">
          <audio controls src={clip.url} className="w-full" />
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={phase === "sending"} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
            <span>{consentText ?? t.consent}</span>
          </label>
          {extraConsent && (
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
              <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} disabled={phase === "sending"} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
              <span>{extraConsent}</span>
            </label>
          )}
          {phase === "sending" && (
            <div className="grid items-center gap-6 rounded-2xl border border-line p-6 sm:grid-cols-[auto_1fr]" aria-live="polite" aria-busy="true">
              <Thinking size={150} thoughts={[t.busy.steps[step]]} label={t.busy.thinking} />
              <div>
                <p className="font-semibold">{t.busy.thinking}</p>
                <ol className="mt-3 space-y-2 text-sm">
                  {t.busy.steps.map((label, i) => (
                    <li key={label} className={`flex items-center gap-3 ${i > step ? "opacity-40" : ""}`}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center" aria-hidden>
                        {i < step ? <span className="pop grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">✓</span>
                          : i === step ? <span className="relative grid h-5 w-5 place-items-center"><span className="breathe absolute inset-0 rounded-full bg-accent" /><span className="relative h-2 w-2 rounded-full bg-accent" /></span>
                          : <span className="h-1.5 w-1.5 rounded-full bg-line" />}
                      </span>
                      <span className={i === step ? "font-semibold" : ""}>{label}{i === 1 && step === 1 ? <span className="ml-2 text-xs text-muted">{t.busy.uploadPct.replace("{n}", String(Math.round(uploaded)))}</span> : null}</span>
                    </li>
                  ))}
                </ol>
                {step === 1 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploaded)}><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${uploaded}%` }} /></div>}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={analyse} disabled={!agreed || phase === "sending"}>{phase === "sending" ? progress : t.analyse}</button>
            <button type="button" className="btn btn-quiet" onClick={reset} disabled={phase === "sending"}>{t.again}</button>
          </div>
        </div>
      )}

      {message && <p role="alert" className="mt-6 rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">{message}</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">{t.errors[error]}</p>}
    </div>
  );
}
