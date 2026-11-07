import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, LogOut, Minus, Pencil, Plus, RotateCcw, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { outputsOf } from "@/components/DishSummary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/use-profile";
import { deleteMyAccount } from "@/lib/dining.functions";
import { ALLERGY_OPTIONS, formatDistance } from "@/lib/dining";
import { FavouriteMenus } from "@/components/FavouriteMenus";
import { useState } from "react";
import { getSettings, useAccessibility } from "@/lib/accessibility";
import { buildDataRecord } from "@/lib/data-record";
import { loadPersonalData } from "@/lib/personal-data";
import { useSpeech } from "@/lib/use-speech";

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
  const settings = useAccessibility();
  const { speak } = useSpeech();
  const [exporting, setExporting] = useState(false);
  const recordQuery = useQuery({
    queryKey: ["personal-data-record", userId],
    queryFn: () => loadPersonalData(userId),
  });
  const record = recordQuery.data ? buildDataRecord(recordQuery.data, settings, new Date().toISOString()) : null;
  const prefs = useQuery({
    queryKey: ["prefs"],
    queryFn: async () => (await supabase.from("learned_preferences").select("*").order("weight", { ascending: false })).data ?? [],
  });

  async function adjust(id: string, weight: number) {
    await supabase.from("learned_preferences").update({ weight, user_override: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["prefs"] });
    qc.invalidateQueries({ queryKey: ["personal-data-record", userId] });
  }
  async function resetLearning() {
    await supabase.from("learned_preferences").delete().eq("user_id", userId);
    await supabase.from("events").delete().eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["prefs"] });
    qc.invalidateQueries({ queryKey: ["personal-data-record", userId] });
    toast.success("Learning reset. Your allergies and diet are unchanged.");
  }
  async function exportData() {
    setExporting(true);
    try {
      const data = await loadPersonalData(userId);
      qc.setQueryData(["personal-data-record", userId], data);
      const finalRecord = buildDataRecord(data, getSettings(), new Date().toISOString());
      const blob = new Blob([JSON.stringify(finalRecord, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "dining-assistant-my-data.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Your full record could not be loaded. Please try again; no incomplete file was downloaded."); }
    finally { setExporting(false); }
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

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 py-6">
      <Button asChild variant="bigOutline" size="tap" className="self-start"><Link to="/request">← Back to food</Link></Button>
      <h1 className="text-3xl font-bold">My data</h1>
      <section aria-labelledby="final-record" className="flex flex-col gap-3 text-lg">
        <h2 id="final-record" className="text-2xl font-bold">Final data record</h2>
        {recordQuery.isPending ? <p role="status">Loading your record…</p> : recordQuery.isError ? <><p role="alert">Your complete record could not load.</p><Button variant="bigOutline" size="tap" onClick={() => void recordQuery.refetch()}>Try again</Button></> : record && <>
          <Button variant="bigOutline" size="tap" onClick={() => speak(record.summary.map(s => `${s.title}. ${s.text}`).join(" "))}><Volume2 aria-hidden /> Read my final record</Button>
          <Button variant="bigOutline" size="tap" onClick={() => window.speechSynthesis?.cancel()}>Stop reading</Button>
          {record.summary.map(section => <div key={section.title} className="min-w-0 border-b border-border pb-3"><h3 className="font-bold">{section.title}</h3><p className="break-words">{section.text}</p></div>)}
        </>}
      </section>
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
        <h2 id="acc" className="text-xl font-bold">Accessibility</h2>
        <p className="mt-2">Summaries shown as: {outputsOf(p).join(", ")}.</p>
        <p className="mt-1">Text size, contrast, tap targets, speech speed, captions and toolkit connection are on the Accessibility page.</p>
        <Button asChild variant="big" size="tap" className="mt-3 w-full"><Link to="/accessibility">Accessibility settings</Link></Button>
      </section>

      <section aria-labelledby="learn" className="rounded-2xl border-2 border-foreground bg-card p-4 text-lg">
        <h2 id="learn" className="text-xl font-bold">What I've learned</h2>
        <p className="mt-1">This only changes the order of safe options. It never changes your allergies or diet.</p>
        {(prefs.data ?? []).length === 0 ? <p className="mt-2">Nothing yet. Like, skip or save dishes to teach me.</p> : (
          <ul className="mt-2 flex flex-col gap-2">
            {(prefs.data ?? []).map((lp) => (
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
        <Button variant="big" size="tap" disabled={exporting} onClick={exportData}><Download aria-hidden /> {exporting ? "Preparing your record…" : "Download my data"}</Button>
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
