import { useSyncExternalStore } from "react";

/**
 * Everything the app says out loud is recorded here, so the same words can be
 * shown on screen as captions for people who cannot hear the speech.
 */

export type Spoken = { id: number; text: string };

export const MAX_LINES = 6;

const EMPTY: Spoken[] = [];
const listeners = new Set<() => void>();
let entries: Spoken[] = [];
let seq = 0;

export function pushSpoken(text: string) {
  const t = String(text ?? "").trim();
  if (!t) return;
  entries = [...entries, { id: ++seq, text: t }].slice(-MAX_LINES);
  for (const fn of [...listeners]) fn();
}

export function getTranscript(): Spoken[] {
  return entries;
}

export function clearTranscript() {
  entries = [];
  for (const fn of [...listeners]) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useTranscript(): Spoken[] {
  return useSyncExternalStore(subscribe, getTranscript, () => EMPTY);
}
