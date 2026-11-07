import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { geocodePlace } from "@/lib/maps.functions";
import { setManualLocation } from "@/lib/use-location";
import { useSpeech } from "@/lib/use-speech";

/** Shown when location is refused: say or type a postcode or place name. */
export function LocationPicker({ onRetry, current }: { onRetry?: () => void; current?: string | null }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const geo = useServerFn(geocodePlace);
  const speech = useSpeech();
  const find = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await geo({ data: { query: q } });
      if (!r) { setMsg(`I couldn't find "${q}". Try a postcode or another place.`); speech.speak?.(`I couldn't find ${q}.`); return; }
      setManualLocation(r); speech.speak?.(`Searching near ${r.label}.`);
    } catch { setMsg("Place search isn't working right now. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="loc-h" className="space-y-3 rounded-lg border-2 border-border p-4">
      <h2 id="loc-h" className="text-2xl font-bold">{current ? `Searching near ${current}` : "Where are you?"}</h2>
      {!current && <p className="text-lg">Location is off. Say or type a postcode or place name.</p>}
      <form onSubmit={(e) => { e.preventDefault(); void find(text); }} className="space-y-3">
        <label htmlFor="loc-q" className="block text-lg font-semibold">Postcode or place</label>
        <input id="loc-q" value={text} onChange={(e) => setText(e.target.value)} className="h-14 w-full rounded-md border-2 border-input bg-background px-4 text-xl" placeholder="e.g. W1D 3QU or Soho" />
        <div className="grid gap-3 sm:grid-cols-2">
          {speech.supported && <Button type="button" size="lg" variant="outline" className="h-14 text-lg" onClick={() => speech.listen?.((said: string) => { setText(said); void find(said); })}>Say a place</Button>}
          <Button type="submit" size="lg" className="h-14 text-lg" disabled={busy}>{busy ? "Finding…" : "Search here"}</Button>
        </div>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {current && <Button variant="outline" size="lg" className="h-14 text-lg" onClick={() => { setManualLocation(null); onRetry?.(); }}>Use my location instead</Button>}
        {!current && onRetry && <Button variant="outline" size="lg" className="h-14 text-lg" onClick={onRetry}>Try my location again</Button>}
      </div>
      {msg && <p role="alert" className="text-lg">{msg}</p>}
    </section>
  );
}
