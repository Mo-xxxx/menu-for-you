import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DIET_OPTIONS, ALLERGY_OPTIONS } from "./dining";

const ALLERGENS = ALLERGY_OPTIONS.map((a) => a.id);
const MAX_IMAGE_CHARS = 7_000_000; // ~5MB image as a data URL

export type ExtractedDish = {
  name: string; price: number | null; diet_tags: string[]; ingredients: { name: string; allergen_group: string | null }[];
  possible_allergens: string[]; summary: string;
};

const schema = {
  type: "object", additionalProperties: false, required: ["is_menu", "dishes"],
  properties: {
    is_menu: { type: "boolean" },
    dishes: {
      type: "array", maxItems: 40,
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "price", "diet_tags", "ingredients", "possible_allergens", "summary"],
        properties: {
          name: { type: "string" },
          price: { type: ["number", "null"] },
          diet_tags: { type: "array", items: { type: "string", enum: [...DIET_OPTIONS] } },
          ingredients: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "allergen_group"],
            properties: { name: { type: "string" }, allergen_group: { type: ["string", "null"], enum: [...ALLERGENS, null] } } } },
          possible_allergens: { type: "array", items: { type: "string", enum: ALLERGENS } },
          summary: { type: "string" },
        },
      },
    },
  },
} as const;

const PROMPT = `You read restaurant menu photos for an accessibility app used by people with allergies, visual impairments and dyspraxia.
For each dish visible on the menu, return:
- name exactly as written; price in pounds as a number, or null if not shown.
- diet_tags: ONLY tags the menu states or marks (e.g. a "V" or "VG" symbol, "GF", "halal"). Never guess a diet tag.
- ingredients: listed ingredients, plus standard ingredients of the dish in lower case. Set allergen_group for any ingredient that contains a UK allergen.
- possible_allergens: every allergen the dish likely contains or may contain, including from standard recipes, sauces, frying oil and cross-contamination. Be cautious: when unsure, include it.
- summary: one short plain-English sentence (under 15 words) describing the dish, no marketing words, no health claims.
If the photo is not a menu, set is_menu to false and return no dishes. Return JSON.`;

async function placeDetails(placeId: string) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Maps service is not configured");
  const res = await fetch(`https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": maps, "X-Goog-FieldMask": "id,displayName,location,primaryTypeDisplayName" },
  });
  if (!res.ok) { console.error(`Place details failed [${res.status}]: ${await res.text()}`); throw new Error("Could not find that restaurant."); }
  const p = (await res.json()) as { id: string; displayName?: { text: string }; location: { latitude: number; longitude: number }; primaryTypeDisplayName?: { text: string } };
  return { id: p.id, name: p.displayName?.text ?? "Restaurant", lat: p.location.latitude, lng: p.location.longitude, cuisine: (p.primaryTypeDisplayName?.text ?? "").replace(/ Restaurant$/, "") };
}

/** Reads a menu photo with AI and stores every dish as ai_inferred for this real place. */
export const extractMenuFromPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string; image: string }) => {
    if (typeof d.placeId !== "string" || !/^[\w-]{10,200}$/.test(d.placeId)) throw new Error("Bad place");
    if (typeof d.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(d.image) || d.image.length > MAX_IMAGE_CHARS) throw new Error("Please use a JPG, PNG or WebP photo under 5 MB.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const place = await placeDetails(data.placeId);
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");

    let parsed: { is_menu: boolean; dishes: ExtractedDish[] };
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content: [
          { type: "input_text", text: PROMPT },
          { type: "input_image", image_url: data.image, detail: "high" },
        ] }],
        text: { format: { type: "json_schema", name: "menu", strict: true, schema } },
      });
      const text = res.output_text ?? "";
      parsed = JSON.parse(text);
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("Menu AI failed", e.code, e.httpStatus, e.ids);
        if (e.httpStatus === 402) return { ok: false as const, error: "AI credits have run out. Please try again later." };
        if (e.httpStatus === 429) return { ok: false as const, error: "Too many requests. Please wait a minute and try again." };
      } else console.error("Menu AI parse failed", e);
      return { ok: false as const, error: "I couldn't read that photo. Please try a clearer one." };
    }
    if (!parsed.is_menu || parsed.dishes.length === 0) return { ok: false as const, error: "That doesn't look like a menu. Please try another photo." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rest, error: rErr } = await supabaseAdmin.from("restaurants")
      .upsert({ google_place_id: place.id, name: place.name, cuisine: place.cuisine, lat: place.lat, lng: place.lng, source: "menu_photo", menu_updated_at: new Date().toISOString() }, { onConflict: "google_place_id" })
      .select("id").single();
    if (rErr || !rest) { console.error(rErr); return { ok: false as const, error: "Could not save the menu." }; }

    // Replace this place's previous AI-read dishes with the new reading.
    await supabaseAdmin.from("menu_items").delete().eq("restaurant_id", rest.id).eq("source", "menu_photo");

    let saved = 0;
    for (const d of parsed.dishes.slice(0, 40)) {
      if (!d.name?.trim() || d.price === null || d.price <= 0 || d.price > 500) continue; // price needed for the budget filter
      const { data: item, error } = await supabaseAdmin.from("menu_items").insert({
        restaurant_id: rest.id, name: d.name.trim().slice(0, 120), price: d.price, diet_tags: d.diet_tags.filter((t) => (DIET_OPTIONS as readonly string[]).includes(t)),
        warm: !/salad|cold|sushi|sandwich|ice/i.test(d.name), light: /salad|soup|light|small/i.test(`${d.name} ${d.summary}`),
        summary_text: d.summary.slice(0, 200), audio_summary_text: d.summary.slice(0, 200), allergen_confidence: "ai_inferred",
        source: "menu_photo", added_by: context.userId,
      }).select("id").single();
      if (error || !item) continue;
      // "may contain" rows make the hard allergy filter exclude cautious matches too.
      const rows = [
        ...d.ingredients.map((i, idx) => ({ name: i.name.toLowerCase().trim().slice(0, 80), group: i.allergen_group, key: idx < 3 })),
        ...d.possible_allergens.map((a) => ({ name: `may contain ${a.replace("_", " ")}`, group: a, key: false })),
      ].filter((r) => r.name);
      for (const r of rows) {
        const { data: ing } = await supabaseAdmin.from("ingredients").select("id, allergen_group").eq("name", r.name).maybeSingle();
        let ingId = ing?.id;
        if (!ingId) ingId = (await supabaseAdmin.from("ingredients").insert({ name: r.name, allergen_group: r.group }).select("id").single()).data?.id;
        else if (!ing?.allergen_group && r.group) await supabaseAdmin.from("ingredients").update({ allergen_group: r.group }).eq("id", ingId);
        if (ingId) await supabaseAdmin.from("menu_item_ingredients").upsert({ item_id: item.id, ingredient_id: ingId, is_key: r.key });
      }
      saved++;
    }
    return { ok: true as const, restaurantName: place.name, saved, skippedNoPrice: parsed.dishes.length - saved, dishes: parsed.dishes };
  });
