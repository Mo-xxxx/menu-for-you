import { expect, it } from "vitest";
import { recommendationContext } from "./recommendation-context";

it("profile-only recommendations invent no mood, weather, or craving", () => {
  expect(recommendationContext(null)).toEqual({ mood: "", weather: "", request_text: "" });
});
it("existing requests keep the chosen mood and budget text", () => {
  expect(recommendationContext({ mood: "low", weather: "rain", request_text: "under £12" })).toEqual({ mood: "low", weather: "rain", request_text: "under £12" });
});