import { createClient } from '@supabase/supabase-js';

// For Vite, env vars need VITE_ prefix
// The Vercel integration sets NEXT_PUBLIC_SUPABASE_URL which needs to be mapped
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProgress = {
  id: string;
  user_id: string;
  email: string;
  done_barbarismes: string[];
  done_dialectes: string[];
  created_at: string;
  updated_at: string;
};

export type SyncQueueItem = {
  id: string;
  user_id: string;
  operation: 'add' | 'remove';
  item_type: 'barbarisme' | 'dialecte';
  item_id: string;
  created_at: string;
  synced: boolean;
};
