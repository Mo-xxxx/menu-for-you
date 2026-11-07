// Shared, browser-safe helpers for parsing speech and formatting summaries.
export const DIET_OPTIONS = ["vegan", "vegetarian", "halal", "gluten-free", "dairy-free"] as const;
export const ALLERGY_OPTIONS = [
  { id: "peanuts", label: "Peanuts" },
  { id: "tree_nuts", label: "Tree nuts" },
  { id: "milk", label: "Milk" },
  { id: "egg", label: "Egg" },
  { id: "gluten", label: "Gluten" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
  { id: "fish", label: "Fish" },
  { id: "crustaceans", label: "Shellfish" },
  { id: "celery", label: "Celery" },
  { id: "mustard", label: "Mustard" },
] as const;

export const DEFAULT_LOCATION = { lat: 51.5136, lng: -0.132 };

const DIET_WORDS: Record<string, string> = {
  vegan: "vegan", vegetarian: "vegetarian", veggie: "vegetarian", halal: "halal",
  "gluten free": "gluten-free", "gluten-free": "gluten-free", coeliac: "gluten-free", celiac: "gluten-free",
  "dairy free": "dairy-free", "dairy-free": "dairy-free", "lactose free": "dairy-free",
};
const ALLERGY_WORDS: Record<string, string> = {
  peanut: "peanuts", peanuts: "peanuts", nut: "tree_nuts", nuts: "tree_nuts", "tree nut": "tree_nuts",
  cashew: "tree_nuts", almond: "tree_nuts", milk: "milk", dairy: "milk", lactose: "milk", egg: "egg", eggs: "egg",
  gluten: "gluten", wheat: "gluten", soy: "soy", soya: "soy", sesame: "sesame", fish: "fish",
  shellfish: "crustaceans", prawn: "crustaceans", prawns: "crustaceans", celery: "celery", mustard: "mustard",
};

function findAll(text: string, dict: Record<string, string>) {
  const t = ` ${text.toLowerCase().replace(/[^a-z\s-]/g, " ")} `;
  const out = new Set<string>();
  for (const [word, val] of Object.entries(dict)) if (t.includes(` ${word} `)) out.add(val);
  return [...out];
}
export const parseDiet = (text: string) => findAll(text, DIET_WORDS);
export const parseAllergies = (text: string) => findAll(text, ALLERGY_WORDS);

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
};
function firstNumber(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  for (const w of text.toLowerCase().split(/\s+/)) if (NUMBER_WORDS[w] !== undefined) return NUMBER_WORDS[w];
  return null;
}
/** "under £12", "twelve pounds" -> 12 */
export function parseBudget(text: string): number | null {
  const n = firstNumber(text);
  return n !== null && n > 0 && n <= 200 ? n : null;
}
/** "1 km", "500 metres", "a mile", "10 minutes walk" -> metres */
export function parseDistance(text: string): number | null {
  const t = text.toLowerCase();
  const n = firstNumber(t) ?? (/\ba (mile|kilometre|kilometer|km)\b/.test(t) ? 1 : null);
  if (n === null) return null;
  if (/mile/.test(t)) return Math.round(n * 1609);
  if (/km|kilomet/.test(t)) return Math.round(n * 1000);
  if (/min/.test(t)) return Math.round(n * 80);
  return Math.round(n);
}
/** Free-text request -> soft hints (budget here only ever tightens the hard limit). */
export function parseRequest(text: string) {
  const t = text.toLowerCase();
  const budgetMatch = t.match(/(?:under|below|less than|max|up to)\s*£?\s*(\d+(?:\.\d+)?)/);
  return {
    wantWarm: /\b(warm|hot|cosy|cozy|soup|comfort)\b/.test(t) ? true : null,
    wantLight: /\b(light|fresh|small|salad)\b/.test(t) ? true : null,
    budget: budgetMatch ? parseFloat(budgetMatch[1]) : null,
  };
}

export const formatPrice = (p: number) => `£${Number(p).toFixed(2)}`;
export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} metres` : `${(m / 1000).toFixed(1)} kilometres`;
export const walkMinutes = (m: number) => Math.max(1, Math.round(m / 80));

export function dietMatchText(itemTags: string[], userTags: string[]) {
  if (userTags.length === 0) return "No diet set";
  return `Matches ${userTags.join(", ")}`;
}

/** Audio order is fixed: name, price, distance, diet match, key ingredients. */
export function audioSummary(i: {
  item_name: string; price: number; distance_m: number; restaurant_name: string;
  diet_tags: string[]; key_ingredients: string[];
}, userDiet: string[]) {
  return [
    `${i.item_name}, from ${i.restaurant_name}.`,
    `${formatPrice(i.price)}.`,
    `${formatDistance(i.distance_m)} away, about ${walkMinutes(i.distance_m)} minutes walk.`,
    `${dietMatchText(i.diet_tags, userDiet)}.`,
    `Key ingredients: ${i.key_ingredients.join(", ") || "not listed"}.`,
  ].join(" ");
}

export function reasonText(code: string, weather: string, mood: string) {
  switch (code) {
    case "liked_dish": return "You liked this dish before.";
    case "liked_cuisine": return "You often like this kind of food.";
    case "matches_request": return "It matches what you asked for.";
    case "weather": return weather === "warm" ? "Light and fresh for a warm day." : "Warm and filling for a cold day.";
    case "mood": return mood === "low" ? "Comforting when you feel low." : "Light and bright to match your mood.";
    default: return "Safe for you and close by.";
  }
}

/** Phase 1 weather estimate from the month; replaced by live weather later. */
export function estimateWeather(d = new Date()): { kind: "cold" | "mild" | "warm"; note: string } {
  const m = d.getMonth();
  if (m <= 1 || m >= 10) return { kind: "cold", note: "It is likely cold today. Warm food may help." };
  if (m >= 5 && m <= 7) return { kind: "warm", note: "It is likely warm today. Light food may suit you." };
  return { kind: "mild", note: "It is likely mild today." };
}
export function timeOfDay(d = new Date()) {
  const h = d.getHours();
  return h < 11 ? "morning" : h < 15 ? "lunch" : h < 18 ? "afternoon" : "evening";
}

export const CONFIDENCE_LABEL: Record<string, { label: string; desc: string }> = {
  verified: { label: "Verified", desc: "Allergens checked against the restaurant's official list." },
  restaurant_stated: { label: "Restaurant-stated", desc: "The restaurant lists these allergens. Not independently checked." },
  ai_inferred: { label: "AI-inferred", desc: "Read by AI from a menu. This may be wrong. Never treat it as guaranteed safe." },
};
