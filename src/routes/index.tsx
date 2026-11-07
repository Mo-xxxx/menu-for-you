import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Mic, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dining Assistant — safe food nearby, by voice" },
      { name: "description", content: "Find food near you that fits your allergies, diet and budget. Speak or tap. Hear your best 3 options." },
      { property: "og:title", content: "Dining Assistant — safe food nearby, by voice" },
      { property: "og:description", content: "Find food near you that fits your allergies, diet and budget. Speak or tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/start" }); });
  }, [navigate]);
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-5 py-10">
      <div>
        <p className="text-lg font-bold text-primary">Dining Assistant</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight">Safe food near you, explained simply.</h1>
        <p className="mt-4 text-xl">Tell me your allergies, diet and budget once. Then speak or tap, and I'll read you your best 3 options.</p>
      </div>
      <ul className="space-y-3 text-lg">
        <li className="flex items-center gap-3"><ShieldCheck aria-hidden className="size-7 shrink-0 text-primary" /> Unsafe food is removed before anything is suggested.</li>
        <li className="flex items-center gap-3"><Mic aria-hidden className="size-7 shrink-0 text-primary" /> Works by voice, big buttons or mood buttons.</li>
        <li className="flex items-center gap-3"><MapPin aria-hidden className="size-7 shrink-0 text-primary" /> Only places within your walking distance.</li>
      </ul>
      <Button asChild variant="big" size="xl"><Link to="/auth">Get started</Link></Button>
    </main>
  );
}
