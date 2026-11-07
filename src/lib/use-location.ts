import { useCallback, useEffect, useState } from "react";

export type LatLng = { lat: number; lng: number };
export type Loc = { lat: number; lng: number; real: boolean; actual: LatLng; label: string | null };
export type LocStatus = "asking" | "granted" | "denied" | "manual";

const KEY = "dining-manual-location";
const EVT = "dining-location-change";

function readManual(): (LatLng & { label: string }) | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); return v && Number.isFinite(v.lat) && Number.isFinite(v.lng) ? v : null; } catch { return null; }
}

/** Save a typed or spoken place as the search centre (shared across screens). */
export function setManualLocation(p: (LatLng & { label: string }) | null) {
  if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

/** The user's real search centre: chosen place first, else the device location. No fixed-city fallback. */
export function useLocation() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [status, setStatus] = useState<LocStatus>("asking");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  useEffect(() => {
    const manual = readManual();
    if (manual) { setLoc({ lat: manual.lat, lng: manual.lng, real: true, actual: manual, label: manual.label }); setStatus("manual"); return; }
    if (!navigator.geolocation) { setLoc(null); setStatus("denied"); return; }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => { const a = { lat: p.coords.latitude, lng: p.coords.longitude }; setLoc({ ...a, real: true, actual: a, label: null }); setStatus("granted"); },
      () => { setLoc(null); setStatus("denied"); },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, [tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return { loc, status, retry };
}
