import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dishesSchema, DISH_RULES, menuDateLabel, type ExtractedDish } from "./menu-schema";

export type { ExtractedDish } from "./menu-schema";
const MAX_IMAGE_CHARS = 7_000_000;

const schema = { type: "object", additionalProperties: false, required: ["is_menu", "dishes"], properties: { is_menu: { type: "boolean" }, dishes: dishesSchema } } as const;

const PROMPT = `You read restaurant menu photos for an accessibility app used by people with allergies, visual impairments and dyspraxia.
You may receive several photos of the same menu; combine them and list each dish once.
${DISH_RULES}
If the photo is not a menu, set is_menu to false and return no dishes. Return JSON.`;

/** Reads menu photos with AI; dishes are stored ai_inferred and wait for a person to confirm them. */
export const extractMenuFromPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string; images: string[] }) => {
    if (typeof d.placeId !== "string" || !/^[\w-]{10,200}$/.test(d.placeId)) throw new Error("Bad place");
    if (!Array.isArray(d.images) || d.images.length < 1 || d.images.length > 4) throw new Error("Please add between 1 and 4 photos.");
    for (const img of d.images) if (typeof img !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > MAX_IMAGE_CHARS) throw new Error("Please use JPG, PNG or WebP photos under 5 MB each.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { placeDetails, runMenuAI, saveDishes } = await import("./menu-store.server");
    const place = await placeDetails(data.placeId);
    const ai = await runMenuAI([{ type: "input_text", text: PROMPT }, ...data.images.map((img) => ({ type: "input_image" as const, image_url: img, detail: "high" as const }))], schema);
    if (!ai.ok) return { ok: false as const, error: ai.error || "I couldn't read that photo. Please try a clearer one." };
    const parsed = ai.json as { is_menu: boolean; dishes: ExtractedDish[] };
    if (!parsed.is_menu || parsed.dishes.length === 0) return { ok: false as const, error: "That doesn't look like a menu. Please try another photo." };
    const now = new Date();
    const r = await saveDishes({ place, dishes: parsed.dishes, source: "menu_photo", userId: context.userId, menuDated: `Photo taken ${menuDateLabel({ year: now.getFullYear(), month: now.getMonth() + 1 })}`, sourceUrl: null });
    return { ok: true as const, restaurantId: r.restaurantId, restaurantName: place.name, saved: r.saved, skippedNoPrice: parsed.dishes.length - r.saved, dishes: parsed.dishes };
  });
