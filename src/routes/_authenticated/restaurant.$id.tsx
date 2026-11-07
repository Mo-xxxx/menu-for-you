import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle2, Clock, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/Screen";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/dining";

export const Route = createFileRoute("/_authenticated/restaurant/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ ctx: String(s["ctx"] ?? "") }),
  head: () => ({ meta: [
    { title: "Restaurant menu — Dining Assistant" },
    { name: "description", content: "Full menu for this restaurant, with dishes a person has checked." },
    { property: "og:title", content: "Restaurant menu — Dining Assistant" },
    { property: "og:description", content: "Full menu for this restaurant, with dishes a person has checked." },
  ] }),
  component: MenuPage,
});

type Dish = { id: string; name: string; price: number; summary_text: string; diet_tags: string[]; source: string; review_status: string; menu_item_ingredients: { is_key: boolean; ingredients: { name: string; allergen_group: string | null } | null }[] };

function MenuPage() {
  const { id } = Route.useParams();
  const { ctx } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["menu-page", id],
    queryFn: async () => {
      const [r, m] = await Promise.all([
        supabase.from("restaurants").select("id,name,cuisine,source,menu_dated,menu_source_url,website").eq("id", id).maybeSingle(),
        supabase.from("menu_items").select("id,name,price,summary_text,diet_tags,source,review_status,menu_item_ingredients(is_key,ingredients(name,allergen_group))").eq("restaurant_id", id).order("name"),
      ]);
      return { r: r.data, dishes: (m.data ?? []) as Dish[] };
    },
  });

  async function review(itemId: string, ok: boolean, name: string) {
    const { error } = await supabase.rpc("review_menu_item", { p_item: itemId, p_ok: ok });
    if (error) { toast.error("Could not save. Please try again."); return; }
    toast.success(ok ? `${name} confirmed.` : `${name} removed.`, { action: { label: "Undo", onClick: () => void review(itemId, !ok, name) } });
    qc.invalidateQueries({ queryKey: ["menu-page", id] });
    qc.invalidateQueries({ queryKey: ["safe"] });
  }

  const r = q.data?.r;
  const dishes = q.data?.dishes ?? [];
  const live = dishes.filter((d) => d.review_status !== "rejected");
  const removed = dishes.filter((d) => d.review_status === "rejected");
  const confirmed = live.filter((d) => d.review_status === "confirmed").length;
  const pending = live.length - confirmed;
  const isSample = r?.source === "sample";

  return (
    <Screen step={2} total={4} title={r?.name ?? "Menu"} onBack={() => navigate({ to: "/nearby", search: { ctx } })}>
      {q.isLoading ? <p role="status" className="text-xl">Loading the menu…</p> : !r ? <p role="alert" className="text-xl">I couldn't find this restaurant.</p> : (
        <>
          <p className="text-lg">{r.cuisine}{r.menu_dated ? ` · ${r.menu_dated}` : ""}</p>
          {r.menu_source_url && <p className="text-lg">From: <a className="underline" href={r.menu_source_url} target="_blank" rel="noreferrer">the restaurant's website</a></p>}
          <div role="status" className={`flex items-center gap-3 rounded-xl border-2 border-foreground p-4 text-lg ${confirmed > 0 ? "bg-card" : "bg-warning text-warning-foreground"}`}>
            {confirmed > 0 ? <CheckCircle2 aria-hidden className="size-8 shrink-0" /> : <Clock aria-hidden className="size-8 shrink-0" />}
            <p>{isSample ? <><strong>Sample menu.</strong> Example dishes for trying the app.</>
              : confirmed > 0 ? <><strong>Menu checked.</strong> {confirmed} {confirmed === 1 ? "dish has" : "dishes have"} been confirmed by a person{pending ? `, ${pending} still waiting` : ""}.</>
              : <><strong>Menu not checked yet.</strong> AI read {live.length} dishes. A person must confirm each one before I suggest it.</>}</p>
          </div>
          {!isSample && (
            <p className="flex gap-3 rounded-xl border-2 border-foreground bg-card p-4 text-lg">
              <AlertTriangle aria-hidden className="size-8 shrink-0" />
              <span>Confirm a dish only if its name, price and ingredients match the real menu. Allergens are still AI-inferred — always confirm allergens with the restaurant.</span>
            </p>
          )}
          {live.length === 0 && <p className="text-lg">No dishes on file for this place.</p>}
          <ul className="flex flex-col gap-3">
            {live.map((d) => {
              const ings = d.menu_item_ingredients.map((x) => x.ingredients?.name).filter((n): n is string => !!n);
              const ok = d.review_status === "confirmed";
              return (
                <li key={d.id} className={`rounded-2xl border-2 border-foreground bg-card p-4 text-lg ${ok ? "" : "border-dashed"}`}>
                  <span className="block text-xl font-bold">{d.name} · {formatPrice(Number(d.price))}</span>
                  <span className="block">{ok ? "✓ Confirmed by a person" : "⏳ Waiting for a person to check"} · {d.source === "sample" ? "Sample" : "AI-inferred"}</span>
                  {d.summary_text && <span className="block">{d.summary_text}</span>}
                  {d.diet_tags.length > 0 && <span className="block">Menu says: {d.diet_tags.join(", ")}</span>}
                  {ings.length > 0 && <span className="block">Ingredients: {ings.join(", ")}</span>}
                  {!isSample && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {!ok && <Button variant="big" size="tap" onClick={() => review(d.id, true, d.name)} aria-label={`Confirm ${d.name} matches the menu`}><Check aria-hidden /> Matches menu</Button>}
                      <Button variant="bigOutline" size="tap" className={ok ? "col-span-2" : ""} onClick={() => review(d.id, false, d.name)} aria-label={`Remove ${d.name}, it is wrong`}><X aria-hidden /> Wrong, remove</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {removed.length > 0 && (
            <>
              <h2 className="text-2xl font-bold">Removed dishes</h2>
              <ul className="flex flex-col gap-3">
                {removed.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-foreground p-4 text-lg">
                    <span>{d.name}</span>
                    <Button variant="bigOutline" size="tap" onClick={() => review(d.id, true, d.name)} aria-label={`Put back ${d.name} as confirmed`}><Undo2 aria-hidden /> Put back</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
