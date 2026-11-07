import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classifyWeather } from "./dining";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function creds() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Maps service is not configured");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": maps };
}
function validLatLng(d: { lat: number; lng: number }) {
  if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng) || Math.abs(d.lat) > 90 || Math.abs(d.lng) > 180) throw new Error("Bad location");
}

export type NearbyPlace = { id: string; name: string; lat: number; lng: number; type: string; openNow: boolean | null; priceLevel: string | null };

/** Real restaurants around the user from Google Places (signed-in only, max 20). */
export const nearbyPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; radius: number }) => { validLatLng(d); return { ...d, radius: Math.min(5000, Math.max(100, Math.round(d.radius))) }; })
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: { ...creds(), "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.primaryTypeDisplayName,places.priceLevel,places.currentOpeningHours.openNow" },
      body: JSON.stringify({ includedTypes: ["restaurant", "cafe", "meal_takeaway"], maxResultCount: 20, rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius: data.radius } } }),
    });
    if (!res.ok) { console.error(`Places failed [${res.status}]: ${await res.text()}`); return { places: [] as NearbyPlace[], error: "Nearby places are unavailable right now." }; }
    const json = (await res.json()) as { places?: Array<{ id: string; displayName?: { text: string }; location: { latitude: number; longitude: number }; primaryTypeDisplayName?: { text: string }; priceLevel?: string; currentOpeningHours?: { openNow?: boolean } }> };
    const places: NearbyPlace[] = (json.places ?? []).map((p) => ({
      id: p.id, name: p.displayName?.text ?? "Unnamed place", lat: p.location.latitude, lng: p.location.longitude,
      type: p.primaryTypeDisplayName?.text ?? "Restaurant", openNow: p.currentOpeningHours?.openNow ?? null, priceLevel: p.priceLevel ?? null,
    }));
    return { places, error: null as string | null };
  });

/** Live local weather, turned into a plain one-line note. */
export const currentWeather = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number }) => { validLatLng(d); return d; })
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY_URL}/weather/v1/currentConditions:lookup?location.latitude=${data.lat}&location.longitude=${data.lng}`, { headers: creds() });
    if (!res.ok) { console.error(`Weather failed [${res.status}]: ${await res.text()}`); return null; }
    const j = (await res.json()) as { temperature?: { degrees?: number }; weatherCondition?: { type?: string; description?: { text?: string } } };
    if (typeof j.temperature?.degrees !== "number") return null;
    return classifyWeather(j.temperature.degrees, j.weatherCondition?.type ?? "", j.weatherCondition?.description?.text ?? "");
  });
