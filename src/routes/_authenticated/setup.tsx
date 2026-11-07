import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Undo2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen, MicButton, Heard } from "@/components/Screen";
import { OUTPUT_OPTIONS, outputsOf, type SummaryOutput } from "@/components/DishSummary";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/lib/use-speech";
import { useProfile } from "@/lib/use-profile";
import { ALLERGY_OPTIONS, DIET_OPTIONS, formatDistance, parseAllergies, parseBudget, parseDiet, parseDistance, walkMinutes } from "@/lib/dining";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Your food settings — Dining Assistant" }, { name: "description", content: "Set your diet, allergies, budget and distance." }, { property: "og:title", content: "Your food settings — Dining Assistant" }, { property: "og:description", content: "Set your diet, allergies, budget and distance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Setup,
});

type S = { diet: string[]; allergies: string[]; budget: number; distance: number; outputs: SummaryOutput[] };
const BUDGETS = [8, 10, 12, 15, 20];
const DISTANCES = [500, 1000, 1500, 2500];
const STEPS = ["consent", "diet", "allergies", "budget", "distance", "outputs"] as const;

function Setup() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = Route.useRouteContext();
  const { data: profile } = useProfile();
  const speech = useSpeech();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<S>({ diet: [], allergies: [], budget: 12, distance: 1500, outputs: ["audio", "text"] });
  const [history, setHistory] = useState<S[]>([]);
  const [heard, setHeard] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setS({ diet: profile.diet_tags, allergies: profile.allergies, budget: Number(profile.budget_max), distance: profile.max_distance_m, outputs: outputsOf(profile) });
  }, [profile]);
  useEffect(() => { setHeard(null); }, [step]);

  const change = (next: S) => { setHistory((h) => [...h, s]); setS(next); };
  const undo = () => { const prev = history.at(-1); if (prev) { setS(prev); setHistory((h) => h.slice(0, -1)); toast("Undone"); } };
  const toggle = (key: "diet" | "allergies", v: string) =>
    change({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] });

  function onVoice() {
    if (speech.listening) { speech.stop(); return; }
    speech.listen((t) => {
      setHeard(t);
      const kind = STEPS[step];
      if (kind === "diet") { const d = parseDiet(t); if (d.length) change({ ...s, diet: [...new Set([...s.diet, ...d])] }); }
      if (kind === "allergies") { const a = parseAllergies(t); if (a.length) change({ ...s, allergies: [...new Set([...s.allergies, ...a])] }); }
      if (kind === "budget") { const b = parseBudget(t); if (b) change({ ...s, budget: b }); }
      if (kind === "outputs") {
        const o = OUTPUT_OPTIONS.filter((x) => new RegExp(x.id === "audio" ? "audio|voice|hear|listen|sound" : x.id === "pictures" ? "picture|pic|image|photo|icon|visual" : "text|words|read|written", "i").test(t)).map((x) => x.id);
        if (o.length) change({ ...s, outputs: o });
      }
      if (kind === "distance") { const d = parseDistance(t); if (d) change({ ...s, distance: Math.min(5000, Math.max(200, d)) }); }
    });
  }

  async function consent(yes: boolean) {
    if (!yes) { toast("Nothing has been saved. You need to agree before I can store your food needs."); return; }
    const { error } = await supabase.from("profiles").upsert({ user_id: userId, consent: true, consent_at: new Date().toISOString() });
    if (error) { toast.error("Could not save. Please try again."); return; }
    setStep(1);
  }

  async function finish() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId, consent: true, diet_tags: s.diet, allergies: s.allergies,
      budget_max: s.budget, max_distance_m: s.distance, summary_outputs: s.outputs, setup_complete: true, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error("Could not save. Please try again."); return; }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/request" });
  }

  const back = step > 0 ? () => setStep(step - 1) : undefined;
  const kind = STEPS[step] ?? "consent";
  const titles = {
    consent: "Can I store your food needs?",
    diet: "Do you follow a diet?",
    allergies: "Do you have any allergies?",
    budget: "What is the most you want to spend on one meal?",
    distance: "How far are you happy to go?",
    outputs: "How should I show your food summaries?",
  };
  const prompts = { diet: "For example: “vegan and halal”", allergies: "For example: “peanuts and sesame”", budget: "For example: “twelve pounds”", distance: "For example: “one kilometre” or “ten minutes walk”", outputs: "For example: “audio and pictures”" } as Record<string, string>;

  return (
    <Screen step={step + 1} total={STEPS.length} title={titles[kind]} onBack={back} hideData={step === 0}>
      {kind === "consent" ? (
        <>
          <div className="space-y-3 rounded-xl border-2 border-foreground bg-card p-4 text-lg">
            <p>To find safe food, I need to store your <strong>diet, allergies</strong> and, when you choose one, your <strong>mood</strong>.</p>
            <p>This is sensitive information under UK GDPR. It is only used to filter and order your suggestions. It is never shared.</p>
            <p>You can see, download or delete it at any time in “My data”.</p>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button variant="big" size="xl" onClick={() => consent(true)}><Check aria-hidden /> Yes, I agree</Button>
            <Button variant="bigOutline" size="xl" onClick={() => consent(false)}>No, don't store anything</Button>
          </div>
        </>
      ) : (
        <>
          <MicButton listening={speech.listening} onClick={onVoice} label="Tap to speak" />
          <p className="text-center text-lg">{prompts[kind]}</p>
          {speech.error && <p role="alert" className="text-center text-lg font-bold text-destructive">{speech.error}</p>}
          <Heard text={heard} />

          {kind === "diet" && <ChoiceGrid options={DIET_OPTIONS.map((d) => ({ id: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))} selected={s.diet} onToggle={(v) => toggle("diet", v)} />}
          {kind === "allergies" && <ChoiceGrid options={[...ALLERGY_OPTIONS]} selected={s.allergies} onToggle={(v) => toggle("allergies", v)} />}
          {kind === "budget" && (
            <ChoiceGrid single options={BUDGETS.map((b) => ({ id: String(b), label: `£${b}` }))} selected={[String(s.budget)]} onToggle={(v) => change({ ...s, budget: Number(v) })} />
          )}
          {kind === "distance" && (
            <ChoiceGrid single options={DISTANCES.map((d) => ({ id: String(d), label: `${formatDistance(d)} (${walkMinutes(d)} min)` }))} selected={[String(s.distance)]} onToggle={(v) => change({ ...s, distance: Number(v) })} />
          )}

          {kind === "outputs" && (
            <ChoiceGrid options={OUTPUT_OPTIONS.map((o) => ({ id: o.id, label: `${o.label} — ${o.desc}` }))} selected={s.outputs}
              onToggle={(v) => { const id = v as SummaryOutput; const next = s.outputs.includes(id) ? s.outputs.filter((x) => x !== id) : [...s.outputs, id]; if (next.length) change({ ...s, outputs: next }); else toast("Please keep at least one."); }} />
          )}
          <p aria-live="polite" className="rounded-xl bg-secondary p-3 text-lg">
            <strong>Saved so far: </strong>
            {kind === "diet" && (s.diet.join(", ") || "no diet")}
            {kind === "allergies" && (s.allergies.map((a) => ALLERGY_OPTIONS.find((o) => o.id === a)?.label).join(", ") || "no allergies")}
            {kind === "budget" && `up to £${s.budget}`}
            {kind === "distance" && formatDistance(s.distance)}
            {kind === "outputs" && s.outputs.map((o) => OUTPUT_OPTIONS.find((x) => x.id === o)?.label).join(", ")}
          </p>

          <div className="mt-auto flex flex-col gap-3">
            <Button variant="bigOutline" size="tap" onClick={undo} disabled={history.length === 0}><Undo2 aria-hidden /> Undo last change</Button>
            {step < STEPS.length - 1
              ? <Button variant="big" size="xl" className="justify-center" onClick={() => setStep(step + 1)}>Next</Button>
              : <Button variant="big" size="xl" className="justify-center" onClick={finish} disabled={saving}>Save and find food</Button>}
          </div>
        </>
      )}
    </Screen>
  );
}

function ChoiceGrid({ options, selected, onToggle }: { options: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void; single?: boolean }) {
  return (
    <div role="group" className="grid grid-cols-2 gap-3">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <Button key={o.id} variant="choice" size="tap" aria-pressed={on} onClick={() => onToggle(o.id)} className="justify-start">
            <span aria-hidden className="inline-flex size-6 items-center justify-center rounded border-2 border-current">{on ? "✓" : ""}</span>
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
