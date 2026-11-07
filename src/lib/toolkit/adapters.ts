import { getSettings, setSetting, type TextSize } from "@/lib/accessibility";

/**
 * The app's accessibility settings, shaped the way the accessibility toolkit
 * expects: each one can report whether it is on, turn itself on, and turn
 * itself off. Nothing here talks to the toolkit — it only changes the app.
 */

export type AdapterLike = {
  enabled: boolean;
  enable: (options?: Record<string, unknown>) => void;
  disable: () => void;
};

function toggle(key: "highContrast" | "largeTargets" | "reduceMotion" | "autoRead" | "captions" | "pictureSummaries"): AdapterLike {
  return {
    get enabled() {
      return getSettings()[key];
    },
    enable() {
      setSetting(key, true);
    },
    disable() {
      setSetting(key, false);
    },
  };
}

/** Larger text: on means the app is showing enlarged text at one of two sizes. */
export const largerText: AdapterLike = {
  get enabled() {
    return getSettings().textSize !== "normal";
  },
  enable(options = {}) {
    setSetting("textSize", options["size"] === "xxl" ? "xxl" : "xl");
  },
  disable() {
    setSetting("textSize", "normal");
  },
};

/** Slower spoken summaries, for people who need more time to follow speech. */
export const slowSpeech: AdapterLike = {
  get enabled() {
    return getSettings().speechRate === "slow";
  },
  enable() {
    setSetting("speechRate", "slow");
  },
  disable() {
    setSetting("speechRate", "normal");
  },
};

export const highContrast = toggle("highContrast");
export const largeTargets = toggle("largeTargets");
export const reduceMotion = toggle("reduceMotion");
export const autoRead = toggle("autoRead");
export const captions = toggle("captions");
export const pictureSummaries = toggle("pictureSummaries");

export const ACCESS_ADAPTERS = {
  "larger-text": largerText,
  "high-contrast": highContrast,
  "large-targets": largeTargets,
  "reduce-motion": reduceMotion,
  "slow-speech": slowSpeech,
  "auto-read": autoRead,
  captions,
  "picture-summaries": pictureSummaries,
} as const;

export type AccessAdapterId = keyof typeof ACCESS_ADAPTERS;

/** The text size currently in use, as the app reads it. */
export function currentTextSize(): { size: TextSize } {
  const t = getSettings().textSize;
  return { size: t === "xxl" ? "xxl" : "xl" };
}
