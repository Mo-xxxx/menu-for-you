import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/Screen";
import { LiveMap, type MapPlace } from "@/components/LiveMap";
import { nearbyPlaces } from "@/lib/maps.functions";
import { MenuPhotoUpload } from "@/components/MenuPhotoUpload";
import { supabase } from "@/integrations/supabase/client";
import { useSafeItems } from "@/lib/use-safe-items";
import { useProfile } from "@/lib/use-profile";
import { formatDistance, formatPrice, walkMinutes } from "@/lib/dining";
import type { SafeItem } from "@/lib/dining.functions";

export const Route = createFileRoute("/_authenticated/nearby")({
  validateSearch: (s: Record<string, unknown>) => ({ ctx: String(s["ctx"] ?? "") }),
  head: () => ({ meta: [{ title: "Places near you — Dining Assistant" }, { name: "description", content: "Map and list of nearby places with food that is safe for you." }] }),
  component: Nearby,
});

function Nearby() {
  const { ctx } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data, isLoading, error, loc } = useSafeItems(ctx);
  const [selected, setSelected] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; cuisine: string; distance: number; items: SafeItem[] }>();
    for (const it of data?.items ?? []) {
      const g = m.get(it.restaurant_id) ?? { id: it.restaurant_id, name: it.restaurant_name, cuisine: it.cuisine, distance: it.distance_m, items: [] };
      g.items.push(it); m.set(it.restaurant_id, g);
    }
    return [...m.values()].sort((a, b) => a.distance - b.distance);
  }, [data]);

  const { data: coords } = useQuery({
    queryKey: ["restaurant-coords", groups.map((g) => g.id).join(",")],
    enabled: groups.length > 0,
    queryFn: async () => (await supabase.from("restaurants").select("id,name,lat,lng").in("id", groups.map((g) => g.id))).data ?? [],
  });
  const radius = profile?.max_distance_m ?? 1500;
  const placesFn = useServerFn(nearbyPlaces);
  const live = useQuery({
    queryKey: ["places", loc?.actual.lat.toFixed(3), loc?.actual.lng.toFixed(3), radius],
    enabled: !!loc,
    staleTime: 10 * 60 * 1000,
    queryFn: () => placesFn({ data: { lat: loc!.actual.lat, lng: loc!.actual.lng, radius } }),
  });
  const safeNames = new Set(groups.map((g) => g.name.toLowerCase()));
  const others = (live.data?.places ?? []).filter((p) => !safeNames.has(p.name.toLowerCase()));
  const mapPlaces: MapPlace[] = useMemo(() => {
    const showSample = loc?.real ?? false;
    const a = showSample ? groups.map((g, i) => { const c = coords?.find((x) => x.id === g.id); return c ? { id: g.id, name: g.name, lat: c.lat, lng: c.lng, label: String(i + 1) } : null; }).filter(Boolean) as MapPlace[] : [];
    const start = showSample ? groups.length : 0;
    return [...a, ...others.map((p, i) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, label: String(start + i + 1) }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, coords, live.data, loc?.real]);
  const onSelect = useCallback((id: string) => setSelected(id), []);
  const sel = groups.find((g) => g.id === selected);
  const selOther = others.find((p) => p.id === selected);

  return (
    <Screen step={2} total={4} title={sel ? sel.name : selOther ? selOther.name : "Places near you"} onBack={() => (sel || selOther ? setSelected(null) : navigate({ to: "/request" }))}>
      {isLoading || !loc ? <p role="status" className="text-xl">Finding safe food near you…</p>
        : error ? <p role="alert" className="text-xl text-destructive">Something went wrong. Please go back and try again.</p>
        : groups.length === 0 && others.length === 0 && !live.isLoading ? (
          <p className="rounded-xl border-2 border-foreground bg-card p-4 text-lg">Nothing nearby matches all your needs right now. Try a larger distance or budget in My data.</p>
        ) : selOther ? (
          <>
            <p className="text-lg">{selOther.type}{selOther.openNow === null ? "" : selOther.openNow ? " · Open now" : " · Closed now"}</p>
            <p className="rounded-xl border-2 border-foreground bg-warning p-4 text-lg text-warning-foreground">
              <strong>Menu not checked yet.</strong> I don't have this place's menu, so I can't tell you which dishes are safe for you. Please ask the restaurant directly, or add a menu photo below.
            </p>
            <MenuPhotoUpload placeId={selOther.id} placeName={selOther.name} />
          </>
        ) : sel ? (
          <>
            <p className="text-lg">{sel.cuisine} · {formatDistance(sel.distance)} · about {walkMinutes(sel.distance)} min walk</p>
            <p className="text-lg">Only dishes that are safe for you are shown.</p>
            <ul className="flex flex-col gap-3">
              {sel.items.map((it) => (
                <li key={it.item_id}>
                  <Link to="/item/$id" params={{ id: it.item_id }} search={{ ctx }} className="block rounded-2xl border-2 border-foreground bg-card p-4 text-lg hover:bg-secondary">
                    <span className="block text-xl font-bold">{it.item_name}</span>
                    <span>{formatPrice(it.price)} · {it.summary_text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <LiveMap center={loc.actual} radius={radius} places={mapPlaces} selected={selected} onSelect={onSelect} />
            {live.data?.error && <p role="status" className="text-lg">{live.data.error}</p>}
            <h2 className="text-2xl font-bold">Safe dishes for you</h2>
            {!loc.real && <p className="rounded-xl bg-warning p-3 text-lg text-warning-foreground">Checked menus are only available in central London for now, so these are sample places there.</p>}
            {groups.length === 0 && <p className="text-lg">No checked menus match your needs nearby.</p>}
            <ol className="flex flex-col gap-3">
              {groups.map((g, i) => (
                <li key={g.id}>
                  <button onClick={() => setSelected(g.id)} className="flex w-full items-center gap-4 rounded-2xl border-2 border-foreground bg-card p-4 text-left text-lg hover:bg-secondary">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-accent font-bold">{i + 1}</span>
                    <span><span className="block text-xl font-bold">{g.name}</span>{g.cuisine} · {formatDistance(g.distance)} · {g.items.length} safe {g.items.length === 1 ? "dish" : "dishes"}</span>
                  </button>
                </li>
              ))}
            </ol>
            {others.length > 0 && (
              <>
                <h2 className="text-2xl font-bold">Other places nearby</h2>
                <p className="text-lg">Menus not checked yet — I can't confirm these are safe.</p>
                <ol start={(loc.real ? groups.length : 0) + 1} className="flex flex-col gap-3">
                  {others.map((p, i) => (
                    <li key={p.id}>
                      <button onClick={() => setSelected(p.id)} className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-foreground bg-card p-4 text-left text-lg hover:bg-secondary">
                        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-card font-bold">{(loc.real ? groups.length : 0) + i + 1}</span>
                        <span><span className="block text-xl font-bold">{p.name}</span>{p.type}{p.openNow === null ? "" : p.openNow ? " · Open now" : " · Closed now"} · Menu not checked</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      <div className="sticky bottom-0 mt-auto bg-background pt-3">
        <Button asChild variant="big" size="xl" className="justify-center"><Link to="/top" search={{ ctx }}>Show my best 3</Link></Button>
      </div>
    </Screen>
  );
}
