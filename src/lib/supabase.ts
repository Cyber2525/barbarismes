import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Try all possible env var patterns
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  '';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  '';

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[v0] Supabase configured successfully');
} else {
  console.warn('[v0] Supabase credentials not found. URL:', !!supabaseUrl, 'Key:', !!supabaseAnonKey);
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = () => !!supabase;
