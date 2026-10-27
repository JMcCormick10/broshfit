import { getSupabaseClient } from "./supabase";
import type { Profile } from "./database.types";

export function getProfileAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  return `${import.meta.env.BASE_URL}${avatarUrl.replace(/^\/+/, "")}`;
}

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
