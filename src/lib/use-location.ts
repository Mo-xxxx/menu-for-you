import { useEffect, useState } from "react";
import { DEFAULT_LOCATION } from "./dining";

/**
 * actual: the user's real position (for the live map and weather).
 * lat/lng: where sample menus are searched; falls back to central London when far away.
 */
export function useLocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number; real: boolean; actual: { lat: number; lng: number } } | null>(null);
  useEffect(() => {
    const fallback = () => setLoc({ ...DEFAULT_LOCATION, real: false, actual: DEFAULT_LOCATION });
    if (!navigator.geolocation) { fallback(); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const actual = { lat: p.coords.latitude, lng: p.coords.longitude };
        const far = Math.abs(actual.lat - DEFAULT_LOCATION.lat) > 0.2 || Math.abs(actual.lng - DEFAULT_LOCATION.lng) > 0.3;
        setLoc(far ? { ...DEFAULT_LOCATION, real: false, actual } : { ...actual, real: true, actual });
      },
      fallback,
      { timeout: 6000 },
    );
  }, []);
  return loc;
}
