import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Bookmark, Heart, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PictureSummary, outputsOf } from "@/components/DishSummary";
import { Screen } from "@/components/Screen";
import { supabase } from "@/integrations/supabase/client";
import { useSafeItems } from "@/lib/use-safe-items";
import { useProfile } from "@/lib/use-profile";
import { useSpeech } from "@/lib/use-speech";
import { audioSummary, CONFIDENCE_LABEL, dietMatchText, formatDistance, formatPrice, reasonText } from "@/lib/dining";

export const Route = createFileRoute("/_authenticated/item/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ ctx: String(s["ctx"] ?? "") }),
  head: () => ({ meta: [{ title: "Dish details — Dining Assistant" }, { name: "description", content: "Full ingredients and allergen information for this dish.", { property: "og:title", content: "Dish details — Dining Assistant" }, { property: "og:description", content: "Full ingredients and allergen information for this dish." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Item,
});

function Item() {
  const { id } = Route.useParams();
  const { ctx } = Route.useSearch();
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data, isLoading, error, refetch } = useSafeItems(ctx);
  const { speak } = useSpeech();
  const it = data?.items.find((x) => x.item_id === id);

  const { data: ingredients } = useQuery({
    queryKey: ["ingredients", id],
    queryFn: async () => (await supabase.from("menu_item_ingredients").select("is_key, ingredients(name, allergen_group)").eq("item_id", id)).data ?? [],
  });

  async function record(type: "liked" | "skipped" | "saved") {
    const { error } = await supabase.from("events").insert({ user_id: userId, item_id: id, type, context_id: ctx || null });
    if (error) { toast.error("Could not save. Please try again."); return; }
    toast.success(type === "liked" ? "Liked. I'll remember this." : type === "saved" ? "Saved for later." : "Skipped. I'll suggest this less.");
    if (type === "skipped") navigate({ to: "/top", search: { ctx } });
  }

  const conf = it ? CONFIDENCE_LABEL[it.allergen_confidence] : null;
  return (
    <Screen step={4} total={4} title={it?.item_name ?? "Dish details"} onBack={() => navigate({ to: "/top", search: { ctx } })}>
      {isLoading ? <p role="status" className="text-xl">Loading…</p> : error ? <><p role="alert" className="text-lg">This dish couldn't load. Please try again.</p><Button variant="big" size="xl" onClick={() => void refetch()}>Try again</Button></> : !it ? (
        <p role="alert" className="text-lg">This dish is not available for your settings.</p>
      ) : (
        <>
          {outputsOf(profile).includes("pictures") && <PictureSummary price={it.price} distance={it.distance_m} dietText={dietMatchText(it.diet_tags, profile?.diet_tags ?? [])} ingredients={it.key_ingredients} />}
          <p className="text-xl">{formatPrice(it.price)} · {formatDistance(it.distance_m)} · {it.restaurant_name}</p>
          <p className="text-lg">✓ {dietMatchText(it.diet_tags, profile?.diet_tags ?? [])}</p>
          <p className="text-lg"><strong>Why:</strong> {data && reasonText(it.reason_code, data.ctx.weather, data.ctx.mood)}</p>

          <section aria-labelledby="conf" className="rounded-xl border-2 border-foreground bg-card p-4">
            <h2 id="conf" className="text-xl font-bold">Allergen information: <span className="rounded-md border-2 border-foreground px-2">{conf?.label}</span></h2>
            <p className="mt-1 text-lg">{conf?.desc}</p>
          </section>

          <div role="alert" className="flex gap-3 rounded-xl border-2 border-foreground bg-warning p-4 text-lg text-warning-foreground">
            <AlertTriangle aria-hidden className="size-8 shrink-0" />
            <p><strong>Confirm allergens with the restaurant</strong> before you order. Recipes can change.</p>
          </div>

          <section aria-labelledby="ing">
            <h2 id="ing" className="text-xl font-bold">All ingredients</h2>
            <ul className="mt-2 grid gap-1 text-lg">
              {(ingredients ?? []).map((r, i) => {
                const ing = r.ingredients as { name: string; allergen_group: string | null } | null;
                return <li key={i}>• {ing?.name}{r.is_key ? " (main)" : ""}{ing?.allergen_group ? ` — contains ${ing.allergen_group.replace("_", " ")}` : ""}</li>;
              })}
            </ul>
          </section>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Button variant="big" size="tap" className="col-span-2 min-h-16 text-xl" onClick={() => speak(audioSummary(it, profile?.diet_tags ?? []))}><Volume2 aria-hidden /> Listen</Button>
            <Button variant="bigOutline" size="tap" className="min-h-16" onClick={() => record("liked")}><Heart aria-hidden /> Like</Button>
            <Button variant="bigOutline" size="tap" className="min-h-16" onClick={() => record("saved")}><Bookmark aria-hidden /> Save</Button>
            <Button variant="bigOutline" size="tap" className="col-span-2 min-h-16" onClick={() => record("skipped")}><SkipForward aria-hidden /> Skip this</Button>
          </div>
        </>
      )}
    </Screen>
  );
}
