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
