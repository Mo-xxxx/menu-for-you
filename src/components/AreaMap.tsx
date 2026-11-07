/** Phase 1 schematic map: places plotted around you. Replaced by a live map in phase 2. */
export function AreaMap({ center, places, maxDistance, selected, onSelect }: {
  center: { lat: number; lng: number };
  places: { id: string; name: string; lat: number; lng: number }[];
  maxDistance: number; selected: string | null; onSelect: (id: string) => void;
}) {
  const R = 140;
  const mPerLat = 111320, mPerLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  return (
    <figure className="rounded-2xl border-2 border-foreground bg-card p-2">
      <svg viewBox="-160 -160 320 320" className="mx-auto block aspect-square w-full max-w-sm" role="img" aria-label={`Map of ${places.length} places within your distance`}>
        <circle r={R} className="fill-secondary stroke-foreground" strokeWidth="2" strokeDasharray="6 6" />
        <circle r="9" className="fill-primary stroke-card" strokeWidth="3" />
        <text y="26" textAnchor="middle" className="fill-foreground text-[13px] font-bold">You</text>
        {places.map((p, i) => {
          const x = (((p.lng - center.lng) * mPerLng) / maxDistance) * R;
          const y = (-((p.lat - center.lat) * mPerLat) / maxDistance) * R;
          const on = selected === p.id;
          return (
            <g key={p.id} transform={`translate(${x},${y})`} onClick={() => onSelect(p.id)} className="cursor-pointer" aria-hidden>
              <circle r={on ? 15 : 12} className={on ? "fill-foreground" : "fill-accent stroke-foreground"} strokeWidth="2" />
              <text y="5" textAnchor="middle" className={`text-[13px] font-bold ${on ? "fill-card" : "fill-foreground"}`}>{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="px-2 pb-1 text-base">Dashed circle = your maximum distance. Numbers match the list below.</figcaption>
    </figure>
  );
}
