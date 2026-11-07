import { useEffect, useState } from "react";
import { DEFAULT_LOCATION } from "./dining";

export function useLocation() {
  const [loc, setLoc] = useState<{ lat: number; lng: number; real: boolean } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) { setLoc({ ...DEFAULT_LOCATION, real: false }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, real: true }),
      () => setLoc({ ...DEFAULT_LOCATION, real: false }),
      { timeout: 6000 },
    );
  }, []);
  return loc;
}
