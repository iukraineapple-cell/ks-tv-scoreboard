import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ybyxdnarvgzlregzpmow.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_E9g7sH3MdeZzTskrdUfKlQ_DTcSuFAe";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}
