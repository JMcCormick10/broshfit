import { getSupabaseClient } from "./supabase";
import type { Profile, ProfileCharacter } from "./database.types";

export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("id, name, label, detail, initial, accent, avatar_url, character")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfileCharacter(
  profileId: string,
  character: ProfileCharacter,
): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .update({ character })
    .eq("id", profileId)
    .select("id, name, label, detail, initial, accent, avatar_url, character")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
