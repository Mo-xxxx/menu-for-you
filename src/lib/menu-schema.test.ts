import { describe, expect, it } from "vitest";
import { isMenuCurrent, menuDateLabel } from "./menu-schema";

const now = new Date(2026, 10, 7); // 7 Nov 2026
describe("website menu freshness", () => {
  it("accepts a menu dated this year", () => expect(isMenuCurrent({ year: 2026, month: null }, now)).toBe(true));
  it("accepts a menu from the last 3 months across the year boundary", () =>
    expect(isMenuCurrent({ year: 2026, month: 10 }, new Date(2027, 0, 10))).toBe(true));
  it("rejects last year's menu older than 3 months", () => expect(isMenuCurrent({ year: 2025, month: 6 }, now)).toBe(false));
  it("rejects undated menus", () => expect(isMenuCurrent({ year: null, month: null }, now)).toBe(false));
  it("labels dates in plain words", () => expect(menuDateLabel({ year: 2026, month: 10 })).toBe("October 2026"));
});
