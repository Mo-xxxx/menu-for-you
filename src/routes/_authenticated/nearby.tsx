import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/Screen";
import { AreaMap } from "@/components/AreaMap";
import { supabase } from "@/integrations/supabase/client";
import { useSafeItems } from "@/lib/use-safe-items";
import { useProfile } from "@/lib/use-profile";
import { formatDistance, formatPrice, walkMinutes } from "@/lib/dining";
import type { SafeItem } from "@/lib/dining.functions";

export const Route = createFileRoute("/_authenticated/nearby")({
  validateSearch: (s: Record<string, unknown>) => ({ ctx: String(s.ctx ?? "") }),
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
  const ordered = groups.map((g) => coords?.find((c) => c.id === g.id)).filter(Boolean) as { id: string; name: string; lat: number; lng: number }[];
  const sel = groups.find((g) => g.id === selected);

  return (
    <Screen step={2} total={4} title={sel ? sel.name : "Places near you"} onBack={() => (sel ? setSelected(null) : navigate({ to: "/request" }))}>
      {isLoading || !loc ? <p role="status" className="text-xl">Finding safe food near you…</p>
        : error ? <p role="alert" className="text-xl text-destructive">Something went wrong. Please go back and try again.</p>
        : groups.length === 0 ? (
          <p className="rounded-xl border-2 border-foreground bg-card p-4 text-lg">Nothing nearby matches all your needs right now. Try a larger distance or budget in My data.</p>
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
            {!loc.real && <p className="rounded-xl bg-warning p-3 text-lg text-warning-foreground">Showing the sample area in central London.</p>}
            {loc && <AreaMap center={loc} places={ordered} maxDistance={profile?.max_distance_m ?? 1500} selected={selected} onSelect={setSelected} />}
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
          </>
        )}
      <div className="sticky bottom-0 mt-auto bg-background pt-3">
        <Button asChild variant="big" size="xl" className="justify-center"><Link to="/top" search={{ ctx }}>Show my best 3</Link></Button>
      </div>
    </Screen>
  );
}
