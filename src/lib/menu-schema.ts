import { DIET_OPTIONS, ALLERGY_OPTIONS } from "./dining";

const ALLERGENS = ALLERGY_OPTIONS.map((a) => a.id);

export type ExtractedDish = {
  name: string; price: number | null; diet_tags: string[]; ingredients: { name: string; allergen_group: string | null }[];
  possible_allergens: string[]; possible_diet_tags: string[]; summary: string;
};

export const dishesSchema = {
  type: "array", maxItems: 60,
  items: {
    type: "object", additionalProperties: false,
    required: ["name", "price", "diet_tags", "possible_diet_tags", "ingredients", "possible_allergens", "summary"],
    properties: {
      name: { type: "string" },
      price: { type: ["number", "null"] },
      diet_tags: { type: "array", items: { type: "string", enum: [...DIET_OPTIONS] } },
      possible_diet_tags: { type: "array", items: { type: "string", enum: [...DIET_OPTIONS] } },
      ingredients: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "allergen_group"],
        properties: { name: { type: "string" }, allergen_group: { type: ["string", "null"], enum: [...ALLERGENS, null] } } } },
      possible_allergens: { type: "array", items: { type: "string", enum: ALLERGENS } },
      summary: { type: "string" },
    },
  },
} as const;

export const DISH_RULES = `For each dish, return:
- name exactly as written; price in pounds as a number, or null if not shown.
- diet_tags: ONLY tags the menu states or marks (e.g. "V", "VG", "GF", "halal"). Never guess here.
- possible_diet_tags: diet tags the dish probably fits from its ingredients (shown as unverified guesses only).
- ingredients: listed ingredients plus standard ingredients of the dish, lower case. Set allergen_group for any containing a UK allergen.
- possible_allergens: every allergen the dish likely contains or may contain (recipes, sauces, frying oil, cross-contamination). When unsure, include it.
- summary: one short plain-English sentence (under 15 words), no marketing words, no health claims.`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A website menu counts only if dated this year, or within the last 3 months (covers menus from late last year). */
export function isMenuCurrent(date: { year: number | null; month: number | null }, now = new Date()): boolean {
  if (!date.year) return false;
  const y = now.getFullYear();
  if (date.year === y) return !date.month || date.month <= now.getMonth() + 1;
  if (date.year === y - 1 && date.month) {
    const monthsAgo = (y - date.year) * 12 + (now.getMonth() + 1) - date.month;
    return monthsAgo <= 3;
  }
  return false;
}

export function menuDateLabel(date: { year: number | null; month: number | null }): string {
  if (!date.year) return "Undated";
  return date.month ? `${MONTHS[date.month - 1]} ${date.year}` : String(date.year);
}
