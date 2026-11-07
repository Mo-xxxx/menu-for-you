import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Dining Assistant" },
      { name: "description", content: "Sign in to Dining Assistant to keep your food settings safe." },
      { property: "og:title", content: "Sign in — Dining Assistant" },
      { property: "og:description", content: "Sign in to keep your food settings safe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/start" }); });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) navigate({ to: "/start" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    if (mode === "up" && !res.data.session) setSent(true);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in did not work. Please try again.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-3xl font-bold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      {sent ? (
        <p role="status" className="rounded-xl border-2 border-foreground bg-card p-4 text-lg">Check your email and tap the link to confirm your account.</p>
      ) : (
        <>
          <Button variant="bigOutline" size="xl" onClick={google} className="justify-center">
            <svg aria-hidden viewBox="0 0 24 24" className="!size-5"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </Button>
          <p className="text-center text-lg" aria-hidden>or</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="text-lg font-bold">Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg" />
            </label>
            <label className="text-lg font-bold">Password
              <input type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg" />
            </label>
            <Button type="submit" variant="big" size="xl" disabled={busy} className="justify-center">{mode === "in" ? "Sign in" : "Create account"}</Button>
          </form>
          <Button variant="link" size="tap" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </Button>
        </>
      )}
    </main>
  );
}
