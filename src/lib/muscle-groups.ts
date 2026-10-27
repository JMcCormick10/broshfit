import { getSupabaseClient } from "./supabase";
import type { Database } from "./database.types";

export type MuscleGroup = Database["public"]["Tables"]["muscle_groups"]["Row"];

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  const { data, error } = await getSupabaseClient()
    .from("muscle_groups")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}
