import { DIET_OPTIONS } from "./dining";
import type { ExtractedDish } from "./menu-schema";

export type PlaceInfo = { id: string; name: string; lat: number; lng: number; cuisine: string; website: string | null };

export async function placeDetails(placeId: string): Promise<PlaceInfo> {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Maps service is not configured");
  const res = await fetch(`https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": maps, "X-Goog-FieldMask": "id,displayName,location,primaryTypeDisplayName,websiteUri" },
  });
  if (!res.ok) { console.error(`Place details failed [${res.status}]: ${await res.text()}`); throw new Error("Could not find that restaurant."); }
  const p = (await res.json()) as { id: string; displayName?: { text: string }; location: { latitude: number; longitude: number }; primaryTypeDisplayName?: { text: string }; websiteUri?: string };
  return { id: p.id, name: p.displayName?.text ?? "Restaurant", lat: p.location.latitude, lng: p.location.longitude,
    cuisine: (p.primaryTypeDisplayName?.text ?? "").replace(/ Restaurant$/, ""), website: p.websiteUri ?? null };
}

/** Stores AI-read dishes as ai_inferred + pending human review. Replaces earlier dishes from the same source. */
export async function saveDishes(opts: { place: PlaceInfo; dishes: ExtractedDish[]; source: "menu_photo" | "website"; userId: string | null; menuDated: string; sourceUrl: string | null }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { place } = opts;
  const { data: rest, error: rErr } = await supabaseAdmin.from("restaurants")
    .upsert({ google_place_id: place.id, name: place.name, cuisine: place.cuisine, lat: place.lat, lng: place.lng, source: opts.source,
      website: place.website, menu_dated: opts.menuDated, menu_source_url: opts.sourceUrl, menu_updated_at: new Date().toISOString() }, { onConflict: "google_place_id" })
    .select("id").single();
  if (rErr || !rest) { console.error(rErr); throw new Error("Could not save the menu."); }
  await supabaseAdmin.from("menu_items").delete().eq("restaurant_id", rest.id).eq("source", opts.source);

  let saved = 0;
  for (const d of opts.dishes.slice(0, 60)) {
    if (!d.name?.trim() || d.price === null || d.price <= 0 || d.price > 500) continue; // price needed for the budget filter
    const { data: item, error } = await supabaseAdmin.from("menu_items").insert({
      restaurant_id: rest.id, name: d.name.trim().slice(0, 120), price: d.price, diet_tags: d.diet_tags.filter((t) => (DIET_OPTIONS as readonly string[]).includes(t)),
      warm: !/salad|cold|sushi|sandwich|ice/i.test(d.name), light: /salad|soup|light|small/i.test(`${d.name} ${d.summary}`),
      summary_text: d.summary.slice(0, 200), audio_summary_text: d.summary.slice(0, 200), allergen_confidence: "ai_inferred",
      source: opts.source, added_by: opts.userId, review_status: "pending",
    }).select("id").single();
    if (error || !item) continue;
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
  return { restaurantId: rest.id, saved };
}

export async function runMenuAI(content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" }>, schema: object) {
  const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "menu", strict: true, schema: schema as Record<string, unknown> } },
    });
    const out = (res as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }).output ?? [];
    return { ok: true as const, json: JSON.parse(out.flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("")) };
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("Menu AI failed", e.code, e.httpStatus, e.ids);
      if (e.httpStatus === 402) return { ok: false as const, error: "AI credits have run out. Please try again later." };
      if (e.httpStatus === 429) return { ok: false as const, error: "Too many requests. Please wait a minute and try again." };
    } else console.error("Menu AI parse failed", e);
    return { ok: false as const, error: "" };
  }
}
