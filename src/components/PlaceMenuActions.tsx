import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { importMenuFromWebsite } from "@/lib/menu-website.functions";

/** For a real place: link to its menu page if one exists, and a button to read its website menu. */
export function PlaceMenuActions({ placeId, ctx }: { placeId: string; ctx: string }) {
  const qc = useQueryClient();
  const importFn = useServerFn(importMenuFromWebsite);
  const [state, setState] = useState<{ status: "idle" | "reading" | "error" | "done"; message?: string }>({ status: "idle" });
  const existing = useQuery({
    queryKey: ["place-menu", placeId],
    queryFn: async () => {
      const { data: r } = await supabase.from("restaurants").select("id, menu_dated").eq("google_place_id", placeId).maybeSingle();
      if (!r) return null;
      const { data: items } = await supabase.from("menu_items").select("review_status").eq("restaurant_id", r.id).neq("review_status", "rejected");
      return { ...r, total: items?.length ?? 0, confirmed: (items ?? []).filter((i) => i.review_status === "confirmed").length };
    },
  });

  async function readWebsite() {
    setState({ status: "reading" });
    try {
      const r = await importFn({ data: { placeId } });
      if (!r.ok) { setState({ status: "error", message: r.error }); return; }
      setState({ status: "done", message: `I found ${r.saved} dishes on the website. A person must confirm them before I suggest any.` });
      qc.invalidateQueries({ queryKey: ["place-menu", placeId] });
    } catch {
      setState({ status: "error", message: "Something went wrong. Please try again." });
    }
  }

  const m = existing.data;
  return (
    <section aria-labelledby="menu-actions" className="flex flex-col gap-3">
      <h2 id="menu-actions" className="text-2xl font-bold">Menu</h2>
      {m && m.total > 0 && (
        <Button asChild variant="big" size="xl" className="justify-center">
          <Link to="/restaurant/$id" params={{ id: m.id }} search={{ ctx }}>
            Open menu page · {m.confirmed} of {m.total} checked
          </Link>
        </Button>
      )}
      <Button variant="bigOutline" size="xl" className="justify-center" disabled={state.status === "reading"} onClick={readWebsite}>
        <Globe aria-hidden /> {state.status === "reading" ? "Reading the website…" : "Find menu on their website"}
      </Button>
      <div aria-live="polite" className="min-h-6 text-lg">
        {state.status === "reading" && <p>This can take up to a minute. I only keep menus dated this year or the last few months.</p>}
        {state.status === "error" && <p role="alert" className="font-bold">{state.message}</p>}
        {state.status === "done" && <p className="font-bold">{state.message}</p>}
      </div>
    </section>
  );
}
