import { getSupabaseClient } from "./supabase";
import type { Profile } from "./database.types";

export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("id, name, label, detail, initial, accent, avatar_url")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}
