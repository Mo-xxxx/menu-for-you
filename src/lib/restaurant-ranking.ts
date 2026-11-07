import type { SafeItem } from "./dining.functions";

/** Preserve database ranking when grouping safe dishes into restaurants. */
export function rankedRestaurants(items: SafeItem[]) {
  const groups = new Map<string, { id: string; name: string; cuisine: string; distance: number; score: number; items: SafeItem[] }>();
  for (const item of items) {
    const group = groups.get(item.restaurant_id) ?? {
      id: item.restaurant_id, name: item.restaurant_name, cuisine: item.cuisine,
      distance: item.distance_m, score: item.score, items: [],
    };
    group.score = Math.max(group.score, item.score);
    group.items.push(item);
    groups.set(item.restaurant_id, group);
  }
  return [...groups.values()].sort((a, b) => b.score - a.score || a.distance - b.distance);
}

export function moodLabel(mood: string) {
  return mood === "low" ? "Low — something comforting" : mood === "good" ? "Good — something fresh" : "Okay";
}