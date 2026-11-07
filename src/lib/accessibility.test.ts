import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  seedFromProfile,
  setSetting,
  speechRateValue,
} from "./accessibility";
import { outputsOf } from "@/components/DishSummary";

describe("accessibility settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSettings();
  });

  it("starts high contrast with large text, as the app's own default", () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.highContrast).toBe(true);
    expect(DEFAULT_SETTINGS.textSize).toBe("xl");
  });

  it("applies a change to the page and keeps it for the next visit", () => {
    setSetting("largeTargets", true);
    expect(document.documentElement.getAttribute("data-large-targets")).toBe("on");
    expect(JSON.parse(window.localStorage.getItem("dining-assistant.accessibility") ?? "{}")).toMatchObject({
      largeTargets: true,
    });
  });

  it("uses the slowest speech only when slow speech is on", () => {
    expect(speechRateValue(DEFAULT_SETTINGS)).toBe(0.95);
    setSetting("speechRate", "slow");
    expect(speechRateValue()).toBe(0.75);
  });

  it("does not let a saved profile overwrite choices made on this device", () => {
    setSetting("textSize", "normal");
    seedFromProfile({ text_size: "xxl", high_contrast: false, summary_outputs: ["text"] });
    expect(getSettings().textSize).toBe("normal");
    expect(getSettings().highContrast).toBe(true);
  });

  it("seeds a brand new device from the saved profile", () => {
    seedFromProfile({ text_size: "xxl", high_contrast: false, summary_outputs: ["pictures", "text"] });
    expect(getSettings().textSize).toBe("xxl");
    expect(getSettings().highContrast).toBe(false);
    expect(getSettings().pictureSummaries).toBe(true);
  });

  it("adds picture tiles without dropping the saved audio or text choice", () => {
    expect(outputsOf({ summary_outputs: ["audio"] }, true)).toEqual(["audio", "pictures"]);
    expect(outputsOf({ summary_outputs: ["audio"] }, false)).toEqual(["audio"]);
  });
});
