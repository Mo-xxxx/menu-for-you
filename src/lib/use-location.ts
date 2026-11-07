import { useEffect, useState } from "react";
import { DEFAULT_LOCATION } from "./dining";

export function useLocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number; real: boolean } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) { setLoc({ ...DEFAULT_LOCATION, real: false }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        // Sample menus cover central London only; outside it, show the sample area.
        const far = Math.abs(lat - DEFAULT_LOCATION.lat) > 0.2 || Math.abs(lng - DEFAULT_LOCATION.lng) > 0.3;
        setLoc(far ? { ...DEFAULT_LOCATION, real: false } : { lat, lng, real: true });
      },
      () => setLoc({ ...DEFAULT_LOCATION, real: false }),
      { timeout: 6000 },
    );
  }, []);
  return loc;
}
