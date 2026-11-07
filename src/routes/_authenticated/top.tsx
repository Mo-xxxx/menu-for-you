import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/Screen";
import { useSafeItems } from "@/lib/use-safe-items";
import { useProfile } from "@/lib/use-profile";
import { useSpeech } from "@/lib/use-speech";
import { audioSummary, CONFIDENCE_LABEL, dietMatchText, formatDistance, formatPrice, reasonText } from "@/lib/dining";

export const Route = createFileRoute("/_authenticated/top")({
  validateSearch: (s: Record<string, unknown>) => ({ ctx: String(s["ctx"] ?? "") }),
  head: () => ({ meta: [{ title: "Your best 3 — Dining Assistant" }, { name: "description", content: "Your three best safe food options nearby." }] }),
  component: Top,
});

function Top() {
  const { ctx } = Route.useSearch();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data, isLoading } = useSafeItems(ctx);
  const { speak } = useSpeech();
  const top = (data?.items ?? []).slice(0, 3);
  const diet = profile?.diet_tags ?? [];

  return (
    <Screen step={3} total={4} title="Your best 3" onBack={() => navigate({ to: "/nearby", search: { ctx } })}>
      {isLoading ? <p role="status" className="text-xl">Choosing your best options…</p>
        : top.length === 0 ? <p className="text-lg">Nothing matches all your needs nearby right now.</p> : (
        <ol className="flex flex-col gap-4">
          {top.map((it, i) => (
            <li key={it.item_id} className="rounded-2xl border-2 border-foreground bg-card p-4">
              <button className="w-full text-left" onClick={() => speak(audioSummary(it, diet) + " " + reasonText(it.reason_code, data!.ctx.weather, data!.ctx.mood))}
                aria-label={`Option ${i + 1}: ${it.item_name}. Tap to hear it read aloud.`}>
                <span className="flex items-start justify-between gap-3">
                  <span className="text-2xl font-bold">{i + 1}. {it.item_name}</span>
                  <Volume2 aria-hidden className="size-8 shrink-0" />
                </span>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-lg">
                  <dt className="font-bold">Price</dt><dd>{formatPrice(it.price)}</dd>
                  <dt className="font-bold">Distance</dt><dd>{formatDistance(it.distance_m)} · {it.restaurant_name}</dd>
                  <dt className="font-bold">Diet</dt><dd>✓ {dietMatchText(it.diet_tags, diet)}</dd>
                  <dt className="font-bold">Key</dt><dd>{it.key_ingredients.join(", ")}</dd>
                </dl>
                <p className="mt-2 text-lg"><strong>Why:</strong> {reasonText(it.reason_code, data!.ctx.weather, data!.ctx.mood)}</p>
                <p className="mt-1 text-base">Allergen info: {CONFIDENCE_LABEL[it.allergen_confidence]?.label}</p>
              </button>
              <Button asChild variant="bigOutline" size="tap" className="mt-3 w-full">
                <Link to="/item/$id" params={{ id: it.item_id }} search={{ ctx }}>More details</Link>
              </Button>
            </li>
          ))}
        </ol>
      )}
    </Screen>
  );
}
