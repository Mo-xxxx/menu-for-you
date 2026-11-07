import type { Tables } from "@/integrations/supabase/types";
import type { AccessSettings } from "@/lib/accessibility";
import { ALLERGY_OPTIONS, formatDistance } from "@/lib/dining";

export type PersonalData = {
  profile: Tables<"profiles">;
  events: Tables<"events">[];
  contexts: Tables<"context_snapshots">[];
  learned_preferences: Tables<"learned_preferences">[];
  favourite_menus: (Tables<"favourite_menus"> & { restaurants: { name: string } | null })[];
  restaurant_choices: (Tables<"restaurant_choices"> & { restaurants: { name: string } | null })[];
};

export function buildDataRecord(data: PersonalData, settings: AccessSettings, generatedAt: string) {
  const p = data.profile;
  const moods = { low: 0, good: 0, okay: 0, other: 0 };
  for (const ctx of data.contexts) {
    if (ctx.mood === "low" || ctx.mood === "good" || ctx.mood === "okay") moods[ctx.mood]++;
    else moods.other++;
  }
  const actions: Record<string, number> = {};
  for (const event of data.events) actions[event.type] = (actions[event.type] ?? 0) + 1;
  const latest = [...data.contexts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const allergies = p.allergies.map(a => ALLERGY_OPTIONS.find(o => o.id === a)?.label ?? a);
  const sections = [
    { title: "Food needs", text: `Diet: ${p.diet_tags.join(", ") || "None recorded"}. Allergies: ${allergies.join(", ") || "None recorded"}. Budget: up to £${Number(p.budget_max)}. Search distance: ${formatDistance(p.max_distance_m)}.` },
    { title: "Consent and profile", text: `Consent: ${p.consent ? "given" : "not given"}${p.consent_at ? ` on ${new Date(p.consent_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : ""}. Setup: ${p.setup_complete ? "complete" : "not complete"}. Saved summaries: ${p.summary_outputs.join(", ")}. Voice-first: ${p.voice_first ? "on" : "off"}.` },
    { title: "Moods and requests", text: `${data.contexts.length} saved requests. Low: ${moods.low}. Good: ${moods.good}. Okay (neutral): ${moods.okay}.${moods.other ? ` Other recorded moods: ${moods.other}.` : ""} ${latest ? `Latest request: ${latest.mood}${latest.request_text ? `; ${latest.request_text}` : ""}. Weather: ${latest.weather || "not recorded"}. Time of day: ${latest.time_of_day || "not recorded"}.` : "No request history yet."}` },
    { title: "Dish activity", text: `${data.events.length} recorded actions. ${Object.entries(actions).map(([type, count]) => `${type}: ${count}`).join(". ") || "No dish activity yet"}.` },
    { title: "Learned preferences", text: data.learned_preferences.length ? data.learned_preferences.map(lp => `${lp.value} (${lp.kind}): ${Number(lp.weight) > 0 ? "preferred" : Number(lp.weight) < 0 ? "less preferred" : "neutral"}, weight ${Number(lp.weight)}${lp.user_override ? ", set by you" : ", learned from activity"}`).join(". ") + "." : "No learned preferences yet." },
    { title: "Favourite menus", text: `${data.favourite_menus.length} saved menus. ${data.favourite_menus.map(f => f.restaurants?.name ?? "Restaurant name unavailable").join(", ") || "No favourites yet"}.` },
    { title: "Restaurant choices", text: data.restaurant_choices.length ? `${data.restaurant_choices.length} recorded choices. ${[...data.restaurant_choices].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(c => `${c.restaurants?.name ?? "Restaurant name unavailable"}, ${new Date(c.created_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC${c.context_id ? `, mood: ${data.contexts.find(ctx => ctx.id === c.context_id)?.mood ?? "not recorded"}` : ""}`).join(". ")}.` : "No restaurant choices recorded yet." },
    { title: "Accessibility on this device", text: `Text: ${settings.textSize === "xxl" ? "extra large" : settings.textSize === "xl" ? "large" : "normal"}. High contrast: ${settings.highContrast ? "on" : "off"}. Large tap targets: ${settings.largeTargets ? "on" : "off"}. Reduced motion: ${settings.reduceMotion ? "on" : "off"}. Speech: ${settings.speechRate}. Automatic reading: ${settings.autoRead ? "on" : "off"}. Captions: ${settings.captions ? "on" : "off"}. Picture summaries: ${settings.pictureSummaries ? "on" : "off"}.` },
  ];
  return {
    generated_at: generatedAt,
    summary: sections,
    ...data,
    device_accessibility: { ...settings },
  };
}