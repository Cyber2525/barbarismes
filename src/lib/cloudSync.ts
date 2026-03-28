import { supabase, isSupabaseConfigured } from './supabase';

// Types
export interface UserProgress {
  email: string;
  display_name: string;
  progress_data: string[];
  dialect_progress: string[];
  last_sync_at: string;
  updated_at: string;
}

// Check online status
const isOnline = (): boolean => navigator.onLine;

// Cloud Sync Service
export const cloudSync = {
  // Validate email format
  validateEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9]{1,8}\.santignasi@fje\.edu$/;
    return pattern.test(email);
  },

  // Login: requires server connection. Downloads cloud state. Throws if offline or server error.
  async login(email: string): Promise<{ barbarismes: string[]; dialectes: string[] }> {
    if (!isOnline()) {
      throw new Error('OFFLINE');
    }
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('NO_SUPABASE');
    }

    // Check if user exists
    const { data: existing, error: fetchError } = await supabase
      .from('users_progress')
      .select('*')
      .eq('email', email)
      .single();

    if (existing && !fetchError) {
      return {
        barbarismes: existing.progress_data || [],
        dialectes: existing.dialect_progress || [],
      };
    }

    // User does not exist — create new account with empty progress
    const displayName = email.split('.')[0].toUpperCase();
    const { data: newUser, error: insertError } = await supabase
      .from('users_progress')
      .insert({
        email,
        display_name: displayName,
        progress_data: [],
        dialect_progress: [],
        settings: {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      barbarismes: newUser.progress_data || [],
      dialectes: newUser.dialect_progress || [],
    };
  },

  // Push current local state to cloud (called after every change while logged in)
  async pushProgress(email: string, barbarismes: string[], dialectes: string[]): Promise<void> {
    if (!isOnline() || !isSupabaseConfigured() || !supabase) return;

    const { error } = await supabase
      .from('users_progress')
      .upsert({
        email,
        display_name: email.split('.')[0].toUpperCase(),
        progress_data: barbarismes,
        dialect_progress: dialectes,
        settings: {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (error) throw error;
  },

  // Pull latest state from cloud (for manual sync button)
  async pullProgress(email: string): Promise<{ barbarismes: string[]; dialectes: string[] }> {
    if (!isOnline()) throw new Error('OFFLINE');
    if (!isSupabaseConfigured() || !supabase) throw new Error('NO_SUPABASE');

    const { data, error } = await supabase
      .from('users_progress')
      .select('progress_data, dialect_progress')
      .eq('email', email)
      .single();

    if (error) throw error;

    return {
      barbarismes: data.progress_data || [],
      dialectes: data.dialect_progress || [],
    };
  },

  // Delete account and all data from cloud
  async deleteAccount(email: string): Promise<void> {
    if (!isOnline()) throw new Error('OFFLINE');
    if (!isSupabaseConfigured() || !supabase) throw new Error('NO_SUPABASE');

    const { error } = await supabase
      .from('users_progress')
      .delete()
      .eq('email', email);

    if (error) throw error;
  },
};

// When coming back online while logged in, push any unsaved local state
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const email = localStorage.getItem('fets_current_email');
    if (!email) return;
    const barbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    await cloudSync.pushProgress(email, barbarismes, dialectes);
  });
}
