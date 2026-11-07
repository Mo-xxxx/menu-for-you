import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, LogOut, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTPUT_OPTIONS, outputsOf } from "@/components/DishSummary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/use-profile";
import { deleteMyAccount } from "@/lib/dining.functions";
import { ALLERGY_OPTIONS, formatDistance } from "@/lib/dining";
import { FavouriteMenus } from "@/components/FavouriteMenus";

export const Route = createFileRoute("/_authenticated/my-data")({
  head: () => ({ meta: [{ title: "My data — Dining Assistant" }, { name: "description", content: "See, change, download or delete your data." }, { property: "og:title", content: "My data — Dining Assistant" }, { property: "og:description", content: "See, change, download or delete your data." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: MyData,
});

function MyData() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: p } = useProfile();
  const del = useServerFn(deleteMyAccount);
  const prefs = useQuery({
    queryKey: ["prefs"],
    queryFn: async () => (await supabase.from("learned_preferences").select("*").order("weight", { ascending: false })).data ?? [],
  });

  async function updateProfile(patch: { text_size?: string; high_contrast?: boolean; voice_first?: boolean; summary_outputs?: string[] }) {
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
    if (error) { toast.error("Could not save."); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
  }
  async function adjust(id: string, weight: number) {
    await supabase.from("learned_preferences").update({ weight, user_override: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["prefs"] });
  }
  async function resetLearning() {
    await supabase.from("learned_preferences").delete().eq("user_id", userId);
    await supabase.from("events").delete().eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["prefs"] });
    toast.success("Learning reset. Your allergies and diet are unchanged.");
  }
  async function exportData() {
    const [events, contexts, lp, favourites] = await Promise.all([
      supabase.from("events").select("*"), supabase.from("context_snapshots").select("*"), supabase.from("learned_preferences").select("*"),
      supabase.from("favourite_menus").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({ profile: p, events: events.data, contexts: contexts.data, learned_preferences: lp.data, favourite_menus: favourites.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "dining-assistant-my-data.json"; a.click();
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  async function deleteAll() {
    try { await del(); await signOut(); toast.success("All your data has been deleted."); }
    catch { toast.error("Could not delete. Please try again."); }
  }

  const sizes = [{ id: "normal", label: "Normal" }, { id: "large", label: "Large" }, { id: "xl", label: "Extra large" }];
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 py-6">
      <Button asChild variant="bigOutline" size="tap" className="self-start"><Link to="/request">← Back to food</Link></Button>
      <h1 className="text-3xl font-bold">My data</h1>
      <FavouriteMenus userId={userId} />

      <section aria-labelledby="needs" className="rounded-2xl border-2 border-foreground bg-card p-4 text-lg">
        <h2 id="needs" className="text-xl font-bold">My food needs</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold">Diet</dt><dd>{p?.diet_tags.join(", ") || "None"}</dd>
          <dt className="font-bold">Allergies</dt><dd>{p?.allergies.map((a) => ALLERGY_OPTIONS.find((o) => o.id === a)?.label).join(", ") || "None"}</dd>
          <dt className="font-bold">Budget</dt><dd>up to £{Number(p?.budget_max ?? 0)}</dd>
          <dt className="font-bold">Distance</dt><dd>{formatDistance(p?.max_distance_m ?? 0)}</dd>
          <dt className="font-bold">Consent</dt><dd>{p?.consent ? `Given ${p.consent_at ? new Date(p.consent_at).toLocaleDateString("en-GB") : ""}` : "Not given"}</dd>
        </dl>
        <Button asChild variant="big" size="tap" className="mt-3 w-full"><Link to="/setup"><Pencil aria-hidden /> Change food needs</Link></Button>
      </section>

      <section aria-labelledby="acc" className="rounded-2xl border-2 border-foreground bg-card p-4 text-lg">
        <h2 id="acc" className="text-xl font-bold">Display and voice</h2>
        <p className="mt-2 font-bold">Text size</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {sizes.map((s) => <Button key={s.id} variant="choice" size="tap" aria-pressed={p?.text_size === s.id} onClick={() => updateProfile({ text_size: s.id })}>{s.label}</Button>)}
        </div>
        <div className="mt-3 grid gap-2">
          <Button variant="choice" size="tap" aria-pressed={!!p?.high_contrast} onClick={() => updateProfile({ high_contrast: !p?.high_contrast })}>High contrast: {p?.high_contrast ? "On" : "Off"}</Button>
          <p className="mt-2 font-bold">Show summaries as</p>
          {OUTPUT_OPTIONS.map((o) => { const cur = outputsOf(p); const on = cur.includes(o.id); return (
            <Button key={o.id} variant="choice" size="tap" aria-pressed={on} onClick={() => { const next = on ? cur.filter((x) => x !== o.id) : [...cur, o.id]; if (next.length) updateProfile({ summary_outputs: next }); }}>{o.label}: {on ? "On" : "Off"}</Button>
          ); })}
          <Button variant="choice" size="tap" aria-pressed={!!p?.voice_first} onClick={() => updateProfile({ voice_first: !p?.voice_first })}>Voice first: {p?.voice_first ? "On" : "Off"}</Button>
        </div>
      </section>

      <section aria-labelledby="learn" className="rounded-2xl border-2 border-foreground bg-card p-4 text-lg">
        <h2 id="learn" className="text-xl font-bold">What I've learned</h2>
        <p className="mt-1">This only changes the order of safe options. It never changes your allergies or diet.</p>
        {(prefs.data ?? []).length === 0 ? <p className="mt-2">Nothing yet. Like, skip or save dishes to teach me.</p> : (
          <ul className="mt-2 flex flex-col gap-2">
            {prefs.data!.map((lp) => (
              <li key={lp.id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-foreground p-2">
                <span><span className="block font-bold">{lp.value}</span>{lp.kind === "cuisine" ? "Type of food" : "Dish"} · {Number(lp.weight) > 0 ? "You like this" : Number(lp.weight) < 0 ? "You skip this" : "Neutral"} ({Number(lp.weight)})</span>
                <span className="flex gap-2">
                  <Button variant="bigOutline" size="tap" aria-label={`Like ${lp.value} less`} onClick={() => adjust(lp.id, Number(lp.weight) - 1)}><Minus aria-hidden /></Button>
                  <Button variant="bigOutline" size="tap" aria-label={`Like ${lp.value} more`} onClick={() => adjust(lp.id, Number(lp.weight) + 1)}><Plus aria-hidden /></Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="bigOutline" size="tap" className="mt-3 w-full" onClick={resetLearning}><RotateCcw aria-hidden /> Reset what I've learned</Button>
      </section>

      <section aria-labelledby="priv" className="flex flex-col gap-3">
        <h2 id="priv" className="text-xl font-bold">Your data</h2>
        <Button variant="big" size="tap" onClick={exportData}><Download aria-hidden /> Download my data</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive" size="tap"><Trash2 aria-hidden /> Delete all my data and account</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl">Delete everything?</AlertDialogTitle>
              <AlertDialogDescription className="text-lg">This removes your profile, allergies, diet, history and account. It cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-14 text-lg">No, keep it</AlertDialogCancel>
              <AlertDialogAction className="min-h-14 bg-destructive text-lg text-destructive-foreground" onClick={deleteAll}>Yes, delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="bigOutline" size="tap" onClick={signOut}><LogOut aria-hidden /> Sign out</Button>
      </section>
    </main>
  );
}
