import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Try multiple env var patterns for compatibility
const getEnvVar = (key: string): string | undefined => {
  // Check window for runtime injection
  if (typeof window !== 'undefined' && (window as unknown as Record<string, string>)[key]) {
    return (window as unknown as Record<string, string>)[key];
  }
  // Check import.meta.env for Vite
  const viteKey = `VITE_${key}`;
  const nextKey = `NEXT_PUBLIC_${key}`;
  
  return import.meta.env[viteKey] || import.meta.env[nextKey] || import.meta.env[key];
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('[CloudSync] Supabase credentials not found. Cloud sync disabled.');
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = () => !!supabase;
