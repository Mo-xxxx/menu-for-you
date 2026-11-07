import { useEffect } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
    return data;
  },
});

export function useProfile() {
  const q = useQuery(profileQuery);
  useEffect(() => {
    const p = q.data;
    if (!p) return;
    document.documentElement.dataset.textSize = p.text_size;
    document.documentElement.dataset.contrast = p.high_contrast ? "high" : "standard";
  }, [q.data]);
  return q;
}
