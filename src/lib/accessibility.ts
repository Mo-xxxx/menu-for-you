import { useSyncExternalStore } from "react";

/**
 * The app's own accessibility settings, held in this browser and applied to
 * <html> as data attributes. This is the single runtime authority for how the
 * app looks and sounds; the saved profile only seeds it on first run.
 *
 * Browser-safe: every host read is guarded, so importing this module during
 * server rendering is harmless.
 */

export type TextSize = "normal" | "xl" | "xxl";
export type SpeechRate = "slow" | "normal" | "fast";

export type AccessSettings = {
  textSize: TextSize;
  highContrast: boolean;
  largeTargets: boolean;
  reduceMotion: boolean;
  speechRate: SpeechRate;
  autoRead: boolean;
  captions: boolean;
  pictureSummaries: boolean;
};

export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "xl", label: "Large" },
  { id: "xxl", label: "Extra large" },
];

export const SPEECH_RATES: { id: SpeechRate; label: string; value: number }[] = [
  { id: "slow", label: "Slow", value: 0.75 },
  { id: "normal", label: "Normal", value: 0.95 },
  { id: "fast", label: "Fast", value: 1.1 },
];

/** High contrast and large text are the app's defaults, per its own rules. */
export const DEFAULT_SETTINGS: AccessSettings = {
  textSize: "xl",
  highContrast: true,
  largeTargets: false,
  reduceMotion: false,
  speechRate: "normal",
  autoRead: false,
  captions: false,
  pictureSummaries: false,
};

const STORAGE_KEY = "dining-assistant.accessibility";

const isTextSize = (v: unknown): v is TextSize => v === "normal" || v === "xl" || v === "xxl";
const isSpeechRate = (v: unknown): v is SpeechRate => v === "slow" || v === "normal" || v === "fast";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";

function readStored(): AccessSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      textSize: isTextSize(p.textSize) ? p.textSize : DEFAULT_SETTINGS.textSize,
      highContrast: isBool(p.highContrast) ? p.highContrast : DEFAULT_SETTINGS.highContrast,
      largeTargets: isBool(p.largeTargets) ? p.largeTargets : DEFAULT_SETTINGS.largeTargets,
      reduceMotion: isBool(p.reduceMotion) ? p.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
      speechRate: isSpeechRate(p.speechRate) ? p.speechRate : DEFAULT_SETTINGS.speechRate,
      autoRead: isBool(p.autoRead) ? p.autoRead : DEFAULT_SETTINGS.autoRead,
      captions: isBool(p.captions) ? p.captions : DEFAULT_SETTINGS.captions,
      pictureSummaries: isBool(p.pictureSummaries) ? p.pictureSummaries : DEFAULT_SETTINGS.pictureSummaries,
    };
  } catch {
    return null;
  }
}

let settings: AccessSettings = readStored() ?? { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

export function getSettings(): AccessSettings {
  return settings;
}

/** True once this browser has its own choices, so a saved profile must not overwrite them. */
export function hasOwnChoices(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function applySettings(next: AccessSettings = settings) {
  if (typeof document === "undefined") return;
  const d = document.documentElement.dataset;
  d.textSize = next.textSize;
  d.contrast = next.highContrast ? "high" : "standard";
  d.largeTargets = next.largeTargets ? "on" : "off";
  d.reduceMotion = next.reduceMotion ? "on" : "off";
}

function commit(next: AccessSettings) {
  settings = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode: the settings still work for this visit */
    }
  }
  applySettings(next);
  for (const fn of [...listeners]) fn();
}

export function setSetting<K extends keyof AccessSettings>(key: K, value: AccessSettings[K]) {
  if (settings[key] === value) return;
  commit({ ...settings, [key]: value });
}

export function setSettings(patch: Partial<AccessSettings>) {
  commit({ ...settings, ...patch });
}

export function resetSettings() {
  commit({ ...DEFAULT_SETTINGS });
}

/**
 * Seed from the saved profile, but only when this browser has never chosen
 * anything itself — a person's local choices always win over a stored profile.
 */
export function seedFromProfile(p: {
  text_size?: string | null;
  high_contrast?: boolean | null;
  summary_outputs?: string[] | null;
} | null | undefined) {
  if (!p || hasOwnChoices()) return;
  commit({
    ...settings,
    textSize: isTextSize(p.text_size) ? p.text_size : settings.textSize,
    highContrast: isBool(p.high_contrast) ? p.high_contrast : settings.highContrast,
    pictureSummaries: (p.summary_outputs ?? []).includes("pictures"),
  });
}

/** The spoken speed to use: slow, normal or fast. */
export function speechRateValue(s: AccessSettings = settings): number {
  return SPEECH_RATES.find((r) => r.id === s.speechRate)?.value ?? 0.95;
}

export function useAccessibility(): AccessSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

applySettings();
