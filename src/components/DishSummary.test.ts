import { describe, expect, it } from "vitest";
import { outputsOf } from "./DishSummary";
describe("summary output preference", () => {
  it("uses the saved choice", () => expect(outputsOf({ summary_outputs: ["pictures"] })).toEqual(["pictures"]));
  it("never leaves the user with no way to see a summary", () => expect(outputsOf({ summary_outputs: [] })).toEqual(["text"]));
});
