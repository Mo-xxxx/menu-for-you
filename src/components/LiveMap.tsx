import { useEffect, useRef, useState } from "react";

export type MapPlace = { id: string; name: string; lat: number; lng: number; label: string };
type G = typeof globalThis & { google?: any; __daMapsInit?: () => void };

let loader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  const w = window as G;
  if (w.google?.maps?.Map) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    w.__daMapsInit = () => resolve();
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__daMapsInit&channel=${channel}&language=en-GB&region=GB`;
    s.async = true;
    s.onerror = () => { loader = null; reject(new Error("Map failed to load")); };
    document.head.appendChild(s);
  });
  return loader;
}

/** Real Google map. The numbered list below it is the accessible way to choose a place. */
export function LiveMap({ center, radius, places, selected, onSelect }: {
  center: { lat: number; lng: number }; radius: number; places: MapPlace[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMaps().then(() => {
      if (cancelled || !el.current) return;
      const g = (window as G).google;
      map.current = new g.maps.Map(el.current, {
        center, zoom: 15, clickableIcons: false, disableDefaultUI: true, zoomControl: true, keyboardShortcuts: true,
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });
      setReady(true);
    }).catch(() => setFailed(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const g = (window as G).google;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    const circle = new g.maps.Circle({ map: map.current, center, radius, strokeColor: "#1b2433", strokeWeight: 2, fillOpacity: 0.06, clickable: false });
    const you = new g.maps.Marker({ map: map.current, position: center, title: "You are here",
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#005450", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 } });
    overlays.current.push(circle, you);
    places.forEach((p) => {
      const on = p.id === selected;
      const m = new g.maps.Marker({ map: map.current, position: { lat: p.lat, lng: p.lng }, title: p.name,
        label: { text: p.label, color: on ? "#ffffff" : "#1b2433", fontWeight: "700" },
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: on ? 15 : 12, fillColor: on ? "#1b2433" : "#f2c46d", fillOpacity: 1, strokeColor: "#1b2433", strokeWeight: 2 } });
      m.addListener("click", () => onSelect(p.id));
      overlays.current.push(m);
    });
    const b = circle.getBounds();
    if (b) map.current.fitBounds(b, 8);
  }, [ready, center.lat, center.lng, radius, places, selected, onSelect]);

  return (
    <figure className="overflow-hidden rounded-2xl border-2 border-foreground bg-card">
      <div ref={el} className="h-72 w-full" role="region" aria-label={`Map of ${places.length} places near you`}>
        {failed && <p className="p-4 text-lg">The map could not load. Use the list below.</p>}
      </div>
      <figcaption className="p-2 text-base">Circle = your maximum distance. Numbers match the list below.</figcaption>
    </figure>
  );
}
