import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseRequest } from "./dining";

export type SafeItem = {
  item_id: string; item_name: string; price: number; diet_tags: string[]; summary_text: string;
  allergen_confidence: string; restaurant_id: string; restaurant_name: string; cuisine: string;
  distance_m: number; key_ingredients: string[]; score: number; reason_code: string;
};

/** Hard filters (allergies, diet, budget, distance) run inside the database function before ranking. */
export const findSafeItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ctxId: string; lat: number; lng: number }) => {
    if (typeof d.ctxId !== "string" || !Number.isFinite(d.lat) || !Number.isFinite(d.lng)) throw new Error("Bad input");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ctx, error: ctxErr } = await supabase.from("context_snapshots").select("*").eq("id", data.ctxId).single();
    if (ctxErr || !ctx) throw new Error("Request not found");
    const hints = parseRequest(ctx.request_text);
    const { data: rows, error } = await supabase.rpc("find_safe_items", {
      p_lat: data.lat, p_lng: data.lng, p_mood: ctx.mood, p_weather: ctx.weather,
      p_want_warm: hints.wantWarm ?? undefined, p_want_light: hints.wantLight ?? undefined, p_budget: hints.budget ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ctx: { mood: ctx.mood, weather: ctx.weather, request_text: ctx.request_text }, items: (rows ?? []) as SafeItem[] };
  });

/** Deletes every stored row for the caller, then the account itself. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("events").delete().eq("user_id", userId);
    await supabase.from("learned_preferences").delete().eq("user_id", userId);
    await supabase.from("context_snapshots").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account");
    return { ok: true };
  });
