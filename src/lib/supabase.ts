import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.",
    );
  }

  client = createClient<Database>(url, anonKey);
  return client;
}
