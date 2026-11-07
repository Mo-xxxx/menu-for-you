import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PictureSummary, outputsOf } from "@/components/DishSummary";
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
  const { data, isLoading, error, refetch } = useSafeItems(ctx);
  const { speak } = useSpeech();
  const top = (data?.items ?? []).slice(0, 3);
  const diet = profile?.diet_tags ?? [];
  const out = outputsOf(profile);
  const say = (it: (typeof top)[number]) => audioSummary(it, diet) + " " + (data ? reasonText(it.reason_code, data.ctx.weather, data.ctx.mood) : "");

  return (
    <Screen step={3} total={4} title="Your best 3" onBack={() => navigate({ to: "/nearby", search: { ctx } })}>
      {!ctx ? <><p role="status" className="text-lg">Choose your mood first so I can find food for this request.</p><Button asChild variant="big" size="xl"><Link to="/request">Start a food request</Link></Button></> : isLoading ? <p role="status" className="text-xl">Choosing your best options…</p>
        : error ? <><p role="alert" className="text-lg">Your suggestions couldn't load. Please try again.</p><Button variant="big" size="xl" onClick={() => void refetch()}>Try again</Button></>
        : top.length === 0 ? <>
          <p role="status" className="text-lg">No person-checked dishes match all your needs nearby yet. AI-read dishes must be checked against the restaurant's menu before I can suggest them.</p>
          <Button variant="bigOutline" size="xl" onClick={() => speak("No person-checked dishes match all your needs nearby yet. Open a menu to check dishes against the restaurant's menu. Your allergies, diet, budget and distance still apply.")}><Volume2 aria-hidden /> Listen to why</Button>
          <Button asChild variant="big" size="xl"><Link to="/nearby" search={{ ctx }}>Open menus to check dishes</Link></Button>
          <Button asChild variant="bigOutline" size="xl"><Link to="/my-data">Review my food needs</Link></Button>
        </> : (
        <>
        {out.includes("audio") && (
          <Button variant="big" size="xl" className="justify-center" onClick={() => speak(top.map((it, i) => `Option ${i + 1}. ${say(it)}`).join(" "))}><Volume2 aria-hidden /> Listen to all 3</Button>
        )}
        <ol className="flex flex-col gap-4">
          {top.map((it, i) => (
            <li key={it.item_id} className="rounded-2xl border-2 border-foreground bg-card p-4">
              <button className="w-full text-left" onClick={() => speak(say(it))}
                aria-label={`Option ${i + 1}: ${it.item_name}. Tap to hear it read aloud.`}>
                <span className="flex items-start justify-between gap-3">
                  <span className="text-2xl font-bold">{i + 1}. {it.item_name}</span>
                  <Volume2 aria-hidden className="size-8 shrink-0" />
                </span>
                {out.includes("pictures") && <PictureSummary price={it.price} distance={it.distance_m} dietText={dietMatchText(it.diet_tags, diet)} ingredients={it.key_ingredients} />}
                {(out.includes("text") || !out.includes("pictures")) && <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-lg">
                  <dt className="font-bold">Price</dt><dd>{formatPrice(it.price)}</dd>
                  <dt className="font-bold">Distance</dt><dd>{formatDistance(it.distance_m)} · {it.restaurant_name}</dd>
                  <dt className="font-bold">Diet</dt><dd>✓ {dietMatchText(it.diet_tags, diet)}</dd>
                  <dt className="font-bold">Key</dt><dd>{it.key_ingredients.join(", ")}</dd>
                </dl>}
                <p className="mt-2 text-lg"><strong>Why:</strong> {data && reasonText(it.reason_code, data.ctx.weather, data.ctx.mood)}</p>
                <p className="mt-1 text-base">Allergen info: {CONFIDENCE_LABEL[it.allergen_confidence]?.label}</p>
              </button>
              <Button asChild variant="bigOutline" size="tap" className="mt-3 w-full">
                <Link to="/item/$id" params={{ id: it.item_id }} search={{ ctx }}>More details</Link>
              </Button>
            </li>
          ))}
        </ol>
        </>
      )}
    </Screen>
  );
}
