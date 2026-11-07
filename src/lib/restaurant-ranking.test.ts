import { describe, expect, it } from "vitest";
import { rankedRestaurants } from "./restaurant-ranking";
import type { SafeItem } from "./dining.functions";

const item = (id: string, score: number, distance: number): SafeItem => ({
  item_id: id, item_name: id, restaurant_id: id, restaurant_name: id, cuisine: "Italian",
  score, distance_m: distance, price: 10, diet_tags: [], summary_text: "", allergen_confidence: "restaurant_stated", key_ingredients: [], reason_code: "mood",
});
describe("mood-aware restaurant order", () => {
  it("keeps the database's mood-ranked restaurant ahead of a closer lower-ranked restaurant", () => {
    expect(rankedRestaurants([item("comforting", 0.8, 700), item("closer", 0.1, 100)]).map((r) => r.id)).toEqual(["comforting", "closer"]);
  });
  it("changes restaurant order when the database scores change for a new mood", () => {
    expect(rankedRestaurants([item("warm", 0.1, 100), item("fresh", 0.5, 500)]).map((r) => r.id)).toEqual(["fresh", "warm"]);
  });
});