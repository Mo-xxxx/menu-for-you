import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useProfile } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/start")({
  head: () => ({ meta: [{ title: "Loading — Dining Assistant", { name: "description", content: "Continue to your food settings or start a Dining Assistant request." }, { property: "og:title", content: "Loading — Dining Assistant" }, { property: "og:description", content: "Continue to your food settings or start a Dining Assistant request." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: Start,
});

function Start() {
  const { data, isLoading } = useProfile();
  if (isLoading) return <p role="status" className="p-8 text-xl">Loading…</p>;
  if (!data || !data.consent || !data.setup_complete) return <Navigate to="/setup" />;
  return <Navigate to="/request" />;
}
