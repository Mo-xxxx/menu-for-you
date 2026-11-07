import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useProfile } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/start")({
  head: () => ({ meta: [{ title: "Loading — Dining Assistant" }] }),
  component: Start,
});

function Start() {
  const { data, isLoading } = useProfile();
  if (isLoading) return <p role="status" className="p-8 text-xl">Loading…</p>;
  if (!data || !data.consent || !data.setup_complete) return <Navigate to="/setup" />;
  return <Navigate to="/request" />;
}
