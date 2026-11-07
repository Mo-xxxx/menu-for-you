import { supabase } from "@/integrations/supabase/client";
import type { PersonalData } from "@/lib/data-record";

// Fetch every page rather than silently truncating the final record at the API row limit.
async function allPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await fetchPage(from, from + 499);
    if (result.error) throw result.error;
    if (!result.data) throw new Error("Personal data could not be loaded.");
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}

export async function loadPersonalData(userId: string): Promise<PersonalData> {
  const [profile, events, contexts, preferences, favourites] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    allPages((from, to) => supabase.from("events").select("*").eq("user_id", userId).order("id").range(from, to)),
    allPages((from, to) => supabase.from("context_snapshots").select("*").eq("user_id", userId).order("id").range(from, to)),
    allPages((from, to) => supabase.from("learned_preferences").select("*").eq("user_id", userId).order("id").range(from, to)),
    allPages((from, to) => supabase.from("favourite_menus").select("*,restaurants(name)").eq("user_id", userId).order("restaurant_id").range(from, to)),
  ]);
  if (profile.error) throw profile.error;
  if (!profile.data) throw new Error("Your profile could not be loaded.");
  return { profile: profile.data, events, contexts, learned_preferences: preferences, favourite_menus: favourites };
}