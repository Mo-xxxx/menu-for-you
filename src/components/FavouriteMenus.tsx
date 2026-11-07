import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/lib/use-speech";

function useFavouriteMenus(userId: string) {
  return useQuery({
    queryKey: ["favourite-menus", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("favourite_menus")
        .select("restaurant_id,restaurants(id,name)").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function FavouriteMenuButton({ userId, restaurantId, name }: { userId: string; restaurantId: string; name: string }) {
  const query = useFavouriteMenus(userId);
  const qc = useQueryClient();
  const { speak } = useSpeech();
  const [busy, setBusy] = useState(false);
  const saved = query.data?.some((r) => r.restaurant_id === restaurantId) ?? false;
  async function toggle() {
    setBusy(true);
    try {
      const result = saved
        ? await supabase.from("favourite_menus").delete().eq("user_id", userId).eq("restaurant_id", restaurantId)
        : await supabase.from("favourite_menus").insert({ user_id: userId, restaurant_id: restaurantId });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["favourite-menus", userId] });
      await qc.invalidateQueries({ queryKey: ["safe"] });
      await qc.invalidateQueries({ queryKey: ["personal-data-record", userId] });
      const message = saved ? `${name} removed from favourites.` : `${name} menu added to favourites.`;
      toast.success(message);
      speak(message);
    } catch {
      toast.error("Your favourite couldn't be saved. Please try again.");
    } finally { setBusy(false); }
  }
  if (query.error) return <Button variant="bigOutline" size="xl" onClick={() => void query.refetch()}>Retry loading favourites</Button>;
  return <Button variant={saved ? "big" : "bigOutline"} size="xl" aria-pressed={saved} disabled={busy || query.isPending} onClick={() => void toggle()}>
    <Heart aria-hidden fill={saved ? "currentColor" : "none"} /> {busy ? "Saving…" : saved ? "Favourited menu" : "Favourite this menu"}
  </Button>;
}

export function FavouriteMenus({ userId, ctx = "" }: { userId: string; ctx?: string }) {
  const query = useFavouriteMenus(userId);
  return <section aria-labelledby="favourite-menus" className="flex flex-col gap-3">
    <h2 id="favourite-menus" className="text-2xl font-bold">Favourite menus</h2>
    {query.isPending ? <p role="status" className="text-lg">Loading favourites…</p> : query.error ? <><p role="alert">Favourites couldn't load.</p><Button variant="bigOutline" size="tap" onClick={() => void query.refetch()}>Try again</Button></> : query.data.length === 0 ? <p className="text-lg">No favourite menus yet.</p> :
      <ul className="flex flex-col gap-3">{query.data.map((row) => row.restaurants && <li key={row.restaurant_id}>
        <Button asChild variant="bigOutline" size="xl"><Link to="/restaurant/$id" params={{ id: row.restaurant_id }} search={{ ctx, marker: undefined }}><Heart aria-hidden /> {row.restaurants.name}</Link></Button>
      </li>)}</ul>}
  </section>;
}