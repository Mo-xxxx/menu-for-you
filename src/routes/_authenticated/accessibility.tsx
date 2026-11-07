import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plug, Save, Unplug, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { outputsOf } from "@/components/DishSummary";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/use-profile";
import {
  SPEECH_RATES,
  TEXT_SIZES,
  resetSettings,
  setSetting,
  useAccessibility,
} from "@/lib/accessibility";
import {
  connectToolkit,
  disconnectToolkit,
  forgetToken,
  isToolkitConnected,
  rememberToken,
  savedToken,
  type ToolkitStatus,
} from "@/lib/toolkit/provider";
import { TOOLKIT_URL } from "@/lib/toolkit/config";
import { useSpeech } from "@/lib/use-speech";

export const Route = createFileRoute("/_authenticated/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — Dining Assistant" },
      { name: "description", content: "Choose how the app looks and sounds, and connect it to an accessibility toolkit." },
      { property: "og:title", content: "Accessibility — Dining Assistant" },
      { property: "og:description", content: "Choose how the app looks and sounds, and connect it to an accessibility toolkit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessibilityPage,
});

const STATUS_WORDS: Record<string, string> = {
  connecting: "Connecting…",
  connected: "Connected. The toolkit can now switch these settings while this page is open.",
  reconnecting: "Reconnecting to the toolkit…",
  closed: "Disconnected.",
};

function statusLine(s: ToolkitStatus | null): string {
  if (!s) return "Not connected.";
  if (s.state === "failed") return s.message || "The toolkit refused the connection. Check the token and try again.";
  return STATUS_WORDS[s.state] ?? `Connecting… (${s.state})`;
}

function AccessibilityPage() {
  const a = useAccessibility();
  const { speak } = useSpeech();
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [token, setToken] = useState(savedToken);
  const [status, setStatus] = useState<ToolkitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = isToolkitConnected() || status?.state === "connected";

  function say(text: string) {
    speak(text);
  }

  async function connect() {
    setBusy(true);
    try {
      const s = await connectToolkit({ token, onStatus: setStatus });
      rememberToken(token.trim());
      setStatus(s);
      toast.success("Connected to the toolkit.");
      say("Connected to the accessibility toolkit.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not connect.";
      setStatus({ state: "failed", message });
      toast.error(message);
      say(message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    await disconnectToolkit();
    forgetToken();
    setToken("");
    setStatus({ state: "closed" });
    setBusy(false);
    toast.success("Disconnected from the toolkit.");
    say("Disconnected from the toolkit.");
  }

  async function saveToAccount() {
    const base = outputsOf(profile).filter((o) => o !== "pictures");
    const outputs = a.pictureSummaries ? [...base, "pictures"] : base;
    const { error } = await supabase
      .from("profiles")
      .update({ text_size: a.textSize, high_contrast: a.highContrast, summary_outputs: outputs })
      .eq("user_id", userId);
    if (error) {
      toast.error("Could not save to your account.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Saved to your account, so it follows you to another device.");
    say("Saved to your account.");
  }

  const toggleRow = (key: "highContrast" | "largeTargets" | "reduceMotion" | "autoRead" | "captions" | "pictureSummaries", label: string, note: string) => (
    <Button
      key={key}
      variant="choice"
      size="tap"
      aria-pressed={a[key]}
      onClick={() => {
        setSetting(key, !a[key]);
        say(`${label} ${a[key] ? "off" : "on"}.`);
      }}
      className="flex flex-col items-start gap-0"
    >
      <span className="text-lg font-bold">{label}: {a[key] ? "On" : "Off"}</span>
      <span className="text-base font-normal">{note}</span>
    </Button>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 py-6">
      <Button asChild variant="bigOutline" size="tap" className="self-start">
        <Link to="/request">← Back to food</Link>
      </Button>
      <h1 className="text-3xl font-bold">Accessibility</h1>
      <p className="text-lg">
        Everything here is yours to change, and it takes effect straight away. Nothing on this page changes which food is
        safe for you.
      </p>

      <section aria-labelledby="look" className="rounded-2xl border-2 border-foreground bg-card p-4">
        <h2 id="look" className="text-xl font-bold">How the app looks</h2>
        <p className="mt-1 text-lg font-bold">Text size</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {TEXT_SIZES.map((s) => (
            <Button
              key={s.id}
              variant="choice"
              size="tap"
              aria-pressed={a.textSize === s.id}
              onClick={() => {
                setSetting("textSize", s.id);
                say(`Text size ${s.label}.`);
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {toggleRow("highContrast", "High contrast", "Dark text, strong borders.")}
          {toggleRow("largeTargets", "Large tap targets", "Taller buttons and boxes, easier to hit.")}
          {toggleRow("reduceMotion", "Reduce motion", "No animations or fades.")}
          {toggleRow("pictureSummaries", "Picture summaries", "Show dishes as large picture tiles.")}
        </div>
      </section>

      <section aria-labelledby="sound" className="rounded-2xl border-2 border-foreground bg-card p-4">
        <h2 id="sound" className="text-xl font-bold">How the app sounds</h2>
        <p className="mt-1 text-lg font-bold">Speech speed</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {SPEECH_RATES.map((r) => (
            <Button
              key={r.id}
              variant="choice"
              size="tap"
              aria-pressed={a.speechRate === r.id}
              onClick={() => {
                setSetting("speechRate", r.id);
                say(`Speech ${r.label}.`);
              }}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {toggleRow("autoRead", "Read screens aloud", "Speaks each screen's heading when it opens.")}
          {toggleRow("captions", "Captions", "Shows everything the app says as text.")}
        </div>
        <Button variant="bigOutline" size="tap" className="mt-3 w-full" onClick={() => { resetSettings(); say("Back to the default settings."); }}>
          Back to defaults
        </Button>
        <Button variant="big" size="tap" className="mt-2 w-full" onClick={saveToAccount}>
          <Save aria-hidden /> Save these settings to my account
        </Button>
      </section>

      <section aria-labelledby="toolkit" className="rounded-2xl border-2 border-foreground bg-card p-4">
        <h2 id="toolkit" className="text-xl font-bold">Accessibility toolkit</h2>
        <p className="mt-2 text-lg">
          Connect this app to your accessibility toolkit and its profiles can switch the settings above while this page is
          open. Your token is kept only in this browser.
        </p>
        <label htmlFor="toolkit-token" className="mt-3 block text-lg font-bold">
          Toolkit token
        </label>
        <input
          id="toolkit-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="aat_…"
          autoComplete="off"
          spellCheck={false}
          className="mt-1 min-h-14 w-full rounded-xl border-2 border-foreground bg-background px-3 text-lg"
        />
        <p className="mt-2 text-base">
          Find it on the toolkit's <span className="font-bold">Account &amp; tokens</span> page. It starts with aat_.
        </p>
        <div className="mt-3 grid gap-2">
          {connected ? (
            <Button variant="bigOutline" size="tap" disabled={busy} onClick={disconnect}>
              <Unplug aria-hidden /> Disconnect
            </Button>
          ) : (
            <Button variant="big" size="tap" disabled={busy || !token.trim()} onClick={connect}>
              <Plug aria-hidden /> {busy ? "Connecting…" : "Connect to toolkit"}
            </Button>
          )}
        </div>
        <p aria-live="polite" className="mt-3 text-lg font-bold">
          {statusLine(status)}
        </p>
        <p className="mt-1 break-all text-base">
          Toolkit: <a className="underline" href={TOOLKIT_URL} target="_blank" rel="noreferrer">{TOOLKIT_URL}</a>
        </p>
        <Button variant="bigOutline" size="tap" className="mt-3 w-full" onClick={() => say("This page lets you choose how the app looks and sounds, and connect it to your accessibility toolkit.")}>
          <Volume2 aria-hidden /> Read this page
        </Button>
      </section>
    </main>
  );
}
