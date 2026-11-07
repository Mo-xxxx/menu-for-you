import { describe, expect, it } from "vitest";
import { buildDataRecord, type PersonalData } from "./data-record";
import { DEFAULT_SETTINGS } from "./accessibility";

const data: PersonalData = {
  profile: { user_id: "me", diet_tags: ["vegan"], allergies: ["peanuts"], budget_max: 18, max_distance_m: 1500, voice_first: true, text_size: "xl", high_contrast: true, consent: true, consent_at: "2026-11-07T12:00:00Z", setup_complete: true, updated_at: "2026-11-07T12:00:00Z", summary_outputs: ["audio", "pictures"] },
  events: [{ id: "event", user_id: "me", item_id: "dish", type: "liked", context_id: "ctx", created_at: "2026-11-07T12:00:00Z" }],
  contexts: [{ id: "ctx", user_id: "me", mood: "low", weather: "rain", time_of_day: "lunch", distance_m: 300, request_text: "warm soup", created_at: "2026-11-07T12:00:00Z" }],
  learned_preferences: [{ id: "pref", user_id: "me", kind: "cuisine", value: "Thai", weight: 2, user_override: true }],
  favourite_menus: [{ user_id: "me", restaurant_id: "restaurant", created_at: "2026-11-07T12:00:00Z", restaurants: { name: "Favourite restaurant" } }],
};

describe("final personal record", () => {
  it("keeps all original saved data alongside its summary", () => {
    const record = buildDataRecord(data, DEFAULT_SETTINGS, "2026-11-07T13:00:00Z");
    for (const key of ["profile", "events", "contexts", "learned_preferences", "favourite_menus"] as const) expect(record[key]).toEqual(data[key]);
    expect(record.generated_at).toBe("2026-11-07T13:00:00Z");
  });
  it("counts recorded moods and actions without inventing preferences", () => {
    const summary = buildDataRecord(data, DEFAULT_SETTINGS, "now").summary;
    expect(summary.find(s => s.title === "Moods and requests")?.text).toContain("Low: 1. Good: 0. Okay (neutral): 0.");
    expect(summary.find(s => s.title === "Dish activity")?.text).toContain("liked: 1");
    expect(summary.find(s => s.title === "Learned preferences")?.text).toContain("weight 2, set by you");
  });
  it("copies only allowed device settings, not browser tokens", () => {
    const record = buildDataRecord(data, { ...DEFAULT_SETTINGS, captions: true }, "now");
    expect(record.device_accessibility.captions).toBe(true);
    expect(Object.keys(record.device_accessibility).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(record.summary.find(s => s.title === "Favourite menus")?.text).toContain("Favourite restaurant");
  });
});