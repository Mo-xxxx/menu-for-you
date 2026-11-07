import { Link } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSafeItems } from "@/lib/use-safe-items";
import { useSpeech } from "@/lib/use-speech";
import { audioSummary, formatPrice, reasonText } from "@/lib/dining";
import { LocationPicker } from "@/components/LocationPicker";

export function MenuRecommendations({ restaurantId, ctx, diet }: { restaurantId: string; ctx: string; diet: string[] }) {
  const q = useSafeItems(ctx, restaurantId);
  const { speak } = useSpeech();
  const top = q.data?.items.slice(0, 3) ?? [];
  const summary = top.map((item, i) => `Option ${i + 1}. ${audioSummary(item, diet)} ${reasonText(item.reason_code, q.data?.ctx.weather ?? "", q.data?.ctx.mood ?? "")}`).join(" ");
  return <section aria-labelledby="menu-recommendations" className="flex flex-col gap-3">
    <h2 id="menu-recommendations" className="text-2xl font-bold">My best dishes here</h2>
    {!ctx ? <Button asChild variant="bigOutline" size="tap"><Link to="/request">Choose my mood first</Link></Button>
      : !q.loc ? <LocationPicker />
      : q.isPending ? <p role="status" className="text-lg">Checking this menu against your food needs…</p>
      : q.error ? <><p role="alert">Your suggestions couldn't load.</p><Button variant="bigOutline" size="tap" onClick={() => void q.refetch()}>Try again</Button></>
      : top.length === 0 ? <p role="status" className="text-lg">No person-checked dishes here match your diet, allergies, budget and distance yet. Reading or favouriting a menu does not confirm its dishes.</p>
      : <>
        <Button variant="bigOutline" size="tap" onClick={() => speak(summary)}><Volume2 aria-hidden /> Read my best dishes here</Button>
        <ol className="flex flex-col gap-3">{top.map((item, i) => <li key={item.item_id} className="border-b border-border pb-3 text-lg">
          <h3 className="font-bold">{i + 1}. {item.item_name} · {formatPrice(item.price)}</h3>
          <p>{reasonText(item.reason_code, q.data?.ctx.weather ?? "", q.data?.ctx.mood ?? "")}</p>
          <p>Confirm allergens with the restaurant.</p>
          <Button asChild variant="bigOutline" size="tap" className="mt-2"><Link to="/item/$id" params={{ id: item.item_id }} search={{ ctx }}>More details</Link></Button>
        </li>)}</ol>
      </>}
  </section>;
}