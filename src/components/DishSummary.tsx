import { Beef, Carrot, Drumstick, Egg, Fish, Footprints, Leaf, Milk, PoundSterling, Salad, Soup, Utensils, Wheat, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistance, formatPrice, walkMinutes } from "@/lib/dining";

export type SummaryOutput = "audio" | "pictures" | "text";
export const OUTPUT_OPTIONS: { id: SummaryOutput; label: string; desc: string }[] = [
  { id: "audio", label: "Audio", desc: "Read summaries aloud" },
  { id: "pictures", label: "Pictures", desc: "Large picture symbols" },
  { id: "text", label: "Text", desc: "Written summaries" },
];

const ICONS: [RegExp, LucideIcon][] = [
  [/beef|steak|lamb|pork|burger|mince/, Beef], [/chicken|turkey|duck/, Drumstick], [/fish|salmon|cod|tuna|prawn|shrimp|seafood/, Fish],
  [/egg/, Egg], [/milk|cheese|cream|butter|yoghurt|yogurt|paneer/, Milk], [/bread|wheat|pasta|noodle|flour|bun|rice/, Wheat],
  [/soup|broth|stew|curry|dal/, Soup], [/salad|lettuce|spinach|kale|herb/, Salad], [/carrot|tomato|pepper|onion|potato|veg|bean|lentil|chickpea|mushroom/, Carrot],
];
export const ingredientIcon = (name: string): LucideIcon => ICONS.find(([r]) => r.test(name.toLowerCase()))?.[1] ?? Utensils;

/** Picture-first summary in the fixed order: price, distance, diet match, key ingredients. Words stay under each picture. */
export function PictureSummary({ price, distance, dietText, ingredients }: { price: number | null; distance?: number | null; dietText: string; ingredients: string[] }) {
  const tile = "flex flex-col items-center gap-1 rounded-xl border-2 border-foreground bg-secondary p-3 text-center text-lg font-bold";
  return (
    <div className="mt-2 grid grid-cols-2 gap-3" role="list" aria-label="Picture summary">
      <div role="listitem" className={tile}><PoundSterling aria-hidden className="size-12" />{price === null ? "No price" : formatPrice(price)}</div>
      {distance != null && <div role="listitem" className={tile}><Footprints aria-hidden className="size-12" />{walkMinutes(distance)} min walk<span className="font-normal">{formatDistance(distance)}</span></div>}
      <div role="listitem" className={`${tile} ${distance == null ? "" : "col-span-2"}`}><span aria-hidden className="flex"><Leaf className="size-12" /><Check className="size-12" /></span>{dietText}</div>
      {ingredients.slice(0, 4).map((n) => { const I = ingredientIcon(n); return <div role="listitem" key={n} className={tile}><I aria-hidden className="size-12" />{n}</div>; })}
    </div>
  );
}

export function outputsOf(p: { summary_outputs?: string[] | null } | null | undefined, picturesFromSettings = false): SummaryOutput[] {
  const o = (p?.summary_outputs ?? ["audio", "text"]).filter((x): x is SummaryOutput => ["audio", "pictures", "text"].includes(x));
  const base = o.length ? o : ["text"];
  if (picturesFromSettings && !base.includes("pictures")) return [...base, "pictures"];
  return base;
}
