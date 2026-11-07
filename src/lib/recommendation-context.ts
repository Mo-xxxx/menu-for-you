/** Profile-only requests add no invented mood, weather, or craving boost. */
export function recommendationContext(saved: { mood: string; weather: string; request_text: string } | null) {
  return saved ?? { mood: "", weather: "", request_text: "" };
}