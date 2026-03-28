import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from env (Vite injects these at build time)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('[v0] Supabase URL available:', !!supabaseUrl);
console.log('[v0] Supabase Key available:', !!supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[v0] Supabase client created successfully');
} else {
  console.warn('[v0] Supabase not configured - cloud sync disabled');
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = () => !!supabase;
