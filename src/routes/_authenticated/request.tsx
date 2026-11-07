import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { currentWeather } from "@/lib/maps.functions";
import { useLocation } from "@/lib/use-location";
import { toast } from "sonner";
import { Cloud, Frown, Meh, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen, MicButton, Heard } from "@/components/Screen";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/lib/use-speech";
import { useProfile } from "@/lib/use-profile";
import { estimateWeather, timeOfDay, moodFromWords } from "@/lib/dining";

export const Route = createFileRoute("/_authenticated/request")({
  head: () => ({ meta: [{ title: "What would you like? — Dining Assistant" }, { name: "description", content: "Pick your mood or say what you'd like to eat." }, { property: "og:title", content: "What would you like? — Dining Assistant" }, { property: "og:description", content: "Pick your mood or say what you'd like to eat." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: RequestPage,
});


function RequestPage() {
  const navigate = useNavigate();
  const { userId } = Route.useRouteContext();
  const { data: profile } = useProfile();
  const speech = useSpeech();
  const [mode, setMode] = useState<"mood" | "speak">("mood");
  const [heard, setHeard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loc = useLocation();
  const weatherFn = useServerFn(currentWeather);
  const live = useQuery({
    queryKey: ["weather", loc?.actual.lat.toFixed(2), loc?.actual.lng.toFixed(2)],
    enabled: !!loc, staleTime: 15 * 60 * 1000,
    queryFn: () => weatherFn({ data: { lat: loc!.actual.lat, lng: loc!.actual.lng } }),
  });
  const weather = live.data ?? estimateWeather();
  const weatherNote = !loc || live.isLoading ? "Checking the weather…" : live.data ? weather.note : `${weather.note} (Live weather unavailable.)`;

  async function go(mood: string, text = "") {
    setBusy(true);
    const { data, error } = await supabase.from("context_snapshots").insert({
      user_id: userId, mood, weather: weather.kind, time_of_day: timeOfDay(), request_text: text,
      distance_m: profile?.max_distance_m ?? 0,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { toast.error("Could not start. Please try again."); return; }
    navigate({ to: "/nearby", search: { ctx: data.id } });
  }

  return (
    <Screen step={1} total={4} title={mode === "mood" ? "How are you feeling?" : "Say what you'd like"} onBack={mode === "speak" ? () => { setMode("mood"); setHeard(null); } : undefined}>
      <p className="flex items-center gap-3 rounded-xl border-2 border-foreground bg-card p-3 text-lg">
        <Cloud aria-hidden className="size-7 shrink-0" /> <span aria-live="polite">{weatherNote}</span>
      </p>
      {mode === "mood" ? (
        <>
          <div className="grid gap-3">
            <Button variant="choice" size="xl" disabled={busy} onClick={() => go("low")}><Frown aria-hidden /> Low — something comforting</Button>
            <Button variant="choice" size="xl" disabled={busy} onClick={() => go("okay")}><Meh aria-hidden /> Okay</Button>
            <Button variant="choice" size="xl" disabled={busy} onClick={() => go("good")}><Smile aria-hidden /> Good — something fresh</Button>
          </div>
          <Button variant="big" size="xl" className="mt-auto justify-center" onClick={() => setMode("speak")}>Speak instead</Button>
        </>
      ) : (
        <>
          <MicButton listening={speech.listening} onClick={() => speech.listening ? speech.stop() : speech.listen((t: string) => { setHeard(t); speech.speak?.(`I heard you're feeling ${moodFromWords(t)}.`); })} label="Tap to speak" />
          <p className="text-center text-lg">For example: “Something warm and light, under £12”</p>
          {speech.error && <p role="alert" className="text-center text-lg font-bold text-destructive">{speech.error}</p>}
          <Heard text={heard} />
          {heard && <p aria-live="polite" className="text-center text-xl font-bold">I heard you're feeling {moodFromWords(heard)}.</p>}
          <Button variant="big" size="xl" className="mt-auto justify-center" disabled={!heard || busy} onClick={() => heard && go(moodFromWords(heard), heard)}>
            Yes, find this
          </Button>
        </>
      )}
    </Screen>
  );
}
