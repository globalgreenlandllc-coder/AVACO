"use client";
/** Sends one conversion event (lib/track.ts) when this part of a page appears, for events decided on the server. */
import { useEffect } from "react";
import { track } from "@/lib/track";

export function TrackEvent({ event, id, params = {} }: { event: string; id: string; params?: Record<string, unknown> }) {
  useEffect(() => { track(event, { event_id: id, ...params }); }, [event, id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
