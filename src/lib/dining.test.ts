import { describe, expect, it } from "vitest";
import { audioSummary, classifyWeather, parseAllergies, parseBudget, parseDiet, parseDistance, parseRequest } from "./dining";

describe("speech parsing", () => {
  it("reads a budget like 'under £12'", () => expect(parseRequest("Something warm and light, under £12").budget).toBe(12));
  it("flags warm and light requests", () => {
    const r = parseRequest("Something warm and light, under £12");
    expect(r.wantWarm).toBe(true);
    expect(r.wantLight).toBe(true);
  });
  it("reads spoken budget words", () => expect(parseBudget("fifteen pounds")).toBe(15));
  it("converts a mile to metres", () => expect(parseDistance("one mile")).toBe(1609));
  it("hears diet tags", () => expect(parseDiet("I am vegan and gluten free").sort()).toEqual(["gluten-free", "vegan"]));
  it("hears allergies", () => expect(parseAllergies("peanuts and sesame").sort()).toEqual(["peanuts", "sesame"]));
});

describe("audio summary order", () => {
  it("says name, price, distance, diet match, then key ingredients", () => {
    const s = audioSummary({ item_name: "Tomato soup", restaurant_name: "Soup & Steam", price: 4.5, distance_m: 400, diet_tags: ["vegan"], key_ingredients: ["tomato"] }, ["vegan"]);
    const idx = ["Tomato soup", "£4.50", "400 metres", "Matches vegan", "Key ingredients: tomato"].map((p) => s.indexOf(p));
    expect(idx.every((v) => v >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
});

describe("live weather classification", () => {
  it("treats under 12°C as cold", () => expect(classifyWeather(10, "MOSTLY_CLOUDY", "Mostly cloudy").kind).toBe("cold"));
  it("treats rain as rain whatever the temperature", () => expect(classifyWeather(18, "LIGHT_RAIN", "Light rain").kind).toBe("rain"));
  it("treats over 20°C as warm", () => expect(classifyWeather(24, "CLEAR", "Clear").kind).toBe("warm"));
});

import { menuDishSpeech, menuOverviewSpeech } from "./dining";
describe("menu read-aloud", () => {
  it("reads name, price, diet, ingredients, then status in that order", () => {
    const t = menuDishSpeech({ name: "Lentil soup", price: 6.5, diet_tags: ["vegan"], ingredients: ["lentils", "carrot"], status: "pending" });
    const idx = ["Lentil soup", "£6.50", "vegan", "lentils", "Not checked yet"].map((w) => t.indexOf(w));
    expect(idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]!))).toBe(true);
  });
  it("gives the full price range, not limited by budget", () =>
    expect(menuOverviewSpeech({ name: "Cafe", total: 3, confirmed: 1, cheapest: 4, dearest: 28 })).toContain("from £4.00 to £28.00"));
});

import { moodFromWords as mfw } from "./dining";
describe("spoken mood", () => {
  it("negative feelings are low", () => { expect(mfw("I'm so tired and stressed")).toBe("low"); expect(mfw("fed up today")).toBe("low"); });
  it("positive and optimistic feelings are good", () => { expect(mfw("feeling happy")).toBe("good"); expect(mfw("I'm optimistic")).toBe("good"); });
  it("neutral or food-only is okay", () => { expect(mfw("Something warm and light, under £12")).toBe("okay"); expect(mfw("I'm fine")).toBe("okay"); });
  it("not good is low", () => expect(mfw("not good at all")).toBe("low"));
  it("not bad is good", () => expect(mfw("not bad thanks")).toBe("good"));
  it("mixed feelings are okay", () => expect(mfw("happy but tired")).toBe("okay"));
  it("cold weather is not a mood", () => expect(mfw("it's cold, want soup")).toBe("okay"));
});

import { dishGroup } from "./dining";
it("classifies dishes into veg, fish, chicken and meat groups", () => {
  expect(dishGroup({ item_name: "Grilled salmon", diet_tags: [], key_ingredients: [] })).toBe("Fish and seafood");
  expect(dishGroup({ item_name: "Curry", diet_tags: [], key_ingredients: ["chicken"] })).toBe("Chicken");
  expect(dishGroup({ item_name: "Pizza", diet_tags: [], key_ingredients: ["pepperoni"] })).toBe("Meat");
  expect(dishGroup({ item_name: "Dal", diet_tags: ["vegan"], key_ingredients: ["lentils"] })).toBe("Vegan");
  expect(dishGroup({ item_name: "Margherita", diet_tags: ["vegetarian"], key_ingredients: [] })).toBe("Vegetarian");
});
