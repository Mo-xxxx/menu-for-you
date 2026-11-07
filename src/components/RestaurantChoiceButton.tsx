import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/lib/use-speech";

export function RestaurantChoiceButton({ userId, restaurantId, name, ctx }: { userId: string; restaurantId: string; name: string; ctx: string }) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { speak } = useSpeech();
  async function choose() {
    setBusy(true);
    try {
      const result = await supabase.from("restaurant_choices").insert({ user_id: userId, restaurant_id: restaurantId, context_id: ctx || null }).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Choice not saved");
      const choiceId = result.data.id;
      await qc.invalidateQueries({ queryKey: ["personal-data-record", userId] });
      speak(`${name} saved as your restaurant choice. This does not book a table or confirm allergens.`);
      toast.success(`${name} choice recorded.`, { action: { label: "Undo", onClick: async () => {
        const removed = await supabase.from("restaurant_choices").delete().eq("id", choiceId).eq("user_id", userId);
        if (removed.error) { toast.error("Could not undo. Please try from My data."); return; }
        await qc.invalidateQueries({ queryKey: ["personal-data-record", userId] });
        speak("Restaurant choice removed.");
      } } });
    } catch { toast.error("Your choice could not be saved. Check that you have given consent in My data, then try again."); }
    finally { setBusy(false); }
  }
  return <Button variant="big" size="tap" disabled={busy} onClick={() => void choose()}><Check aria-hidden /> {busy ? "Saving choice…" : "Choose this restaurant"}</Button>;
}