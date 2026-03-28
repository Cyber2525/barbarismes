import { supabase, isSupabaseConfigured } from './supabase';

// Types
export interface UserProgress {
  email: string;
  display_name: string;
  progress_data: string[];
  dialect_progress: string[];
  item_timestamps: ItemTimestamps;
  last_sync_at: string;
  updated_at: string;
}

// item_timestamps structure:
// { "b:BarbarismeName": { state: true, ts: "ISO" }, "d:DialecteName": { state: true, ts: "ISO" } }
// "b:" prefix = barbarisme, "d:" prefix = dialecte
export type ItemTimestamps = Record<string, { state: boolean; ts: string }>;

const TIMESTAMPS_KEY = 'fets_item_timestamps';

// --- Local timestamps helpers ---

export function getLocalTimestamps(): ItemTimestamps {
  try {
    return JSON.parse(localStorage.getItem(TIMESTAMPS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalTimestamps(ts: ItemTimestamps): void {
  localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(ts));
}

// Record a change with the current timestamp
export function recordLocalChange(key: string, state: boolean): void {
  const ts = getLocalTimestamps();
  ts[key] = { state, ts: new Date().toISOString() };
  saveLocalTimestamps(ts);
}

// Apply Last Write Wins between local and cloud timestamps.
// Returns the final barbarismes[], dialectes[], and merged timestamps.
function applyLWW(
  localBarbarismes: string[],
  localDialectes: string[],
  localTs: ItemTimestamps,
  cloudBarbarismes: string[],
  cloudDialectes: string[],
  cloudTs: ItemTimestamps,
): { barbarismes: string[]; dialectes: string[]; timestamps: ItemTimestamps } {
  // All known keys
  const allKeys = new Set([
    ...Object.keys(localTs),
    ...Object.keys(cloudTs),
    ...localBarbarismes.map(k => `b:${k}`),
    ...localDialectes.map(k => `d:${k}`),
    ...cloudBarbarismes.map(k => `b:${k}`),
    ...cloudDialectes.map(k => `d:${k}`),
  ]);

  const finalBarbarismes = new Set<string>();
  const finalDialectes = new Set<string>();
  const finalTs: ItemTimestamps = {};

  for (const key of allKeys) {
    const lEntry = localTs[key];
    const cEntry = cloudTs[key];

    let winningState: boolean;
    let winningTs: string;

    if (lEntry && cEntry) {
      // Both have a timestamp — most recent wins
      if (lEntry.ts >= cEntry.ts) {
        winningState = lEntry.state;
        winningTs = lEntry.ts;
      } else {
        winningState = cEntry.state;
        winningTs = cEntry.ts;
      }
    } else if (lEntry) {
      winningState = lEntry.state;
      winningTs = lEntry.ts;
    } else if (cEntry) {
      winningState = cEntry.state;
      winningTs = cEntry.ts;
    } else {
      // No timestamp at all — infer from presence in arrays
      const inLocal = key.startsWith('b:')
        ? localBarbarismes.includes(key.slice(2))
        : localDialectes.includes(key.slice(2));
      const inCloud = key.startsWith('b:')
        ? cloudBarbarismes.includes(key.slice(2))
        : cloudDialectes.includes(key.slice(2));
      // Union: if in either, consider it done (legacy data without timestamps)
      winningState = inLocal || inCloud;
      winningTs = new Date(0).toISOString(); // epoch — old data, any real change beats this
    }

    finalTs[key] = { state: winningState, ts: winningTs };

    if (winningState) {
      const name = key.slice(2);
      if (key.startsWith('b:')) finalBarbarismes.add(name);
      else if (key.startsWith('d:')) finalDialectes.add(name);
    }
  }

  return {
    barbarismes: Array.from(finalBarbarismes),
    dialectes: Array.from(finalDialectes),
    timestamps: finalTs,
  };
}

// Cloud Sync Service
export const cloudSync = {
  // Validate email format
  validateEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9]{1,8}\.santignasi@fje\.edu$/;
    return pattern.test(email);
  },

  // Login: REQUIRES connection. Returns cloud data or throws.
  async login(email: string): Promise<UserProgress> {
    if (!navigator.onLine) {
      throw new Error('NO_CONNECTION');
    }
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('SUPABASE_NOT_CONFIGURED');
    }

    // Check if user exists
    const { data: existing, error: fetchError } = await supabase
      .from('users_progress')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = row not found — anything else is a real error
      throw new Error('SERVER_ERROR');
    }

    if (existing) {
      return {
        email: existing.email,
        display_name: existing.display_name || email.split('.')[0].toUpperCase(),
        progress_data: existing.progress_data || [],
        dialect_progress: existing.dialect_progress || [],
        item_timestamps: existing.item_timestamps || {},
        last_sync_at: existing.last_sync_at,
        updated_at: existing.updated_at,
      };
    }

    // New user — create
    const displayName = email.split('.')[0].toUpperCase();
    const { data: newUser, error: insertError } = await supabase
      .from('users_progress')
      .insert({
        email,
        display_name: displayName,
        progress_data: [],
        dialect_progress: [],
        item_timestamps: {},
        settings: {},
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw new Error('SERVER_ERROR');

    return {
      email: newUser.email,
      display_name: newUser.display_name,
      progress_data: newUser.progress_data || [],
      dialect_progress: newUser.dialect_progress || [],
      item_timestamps: newUser.item_timestamps || {},
      last_sync_at: newUser.last_sync_at,
      updated_at: newUser.updated_at,
    };
  },

  // Push current local state to cloud (with LWW merge against cloud)
  async sync(email: string): Promise<{ barbarismes: string[]; dialectes: string[] }> {
    if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
      // Offline — just return local state, changes are already tracked locally
      return {
        barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
        dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
      };
    }

    // Pull current cloud state
    const { data, error } = await supabase
      .from('users_progress')
      .select('progress_data, dialect_progress, item_timestamps')
      .eq('email', email)
      .single();

    if (error) throw new Error('SERVER_ERROR');

    const cloudBarbarismes: string[] = data.progress_data || [];
    const cloudDialectes: string[] = data.dialect_progress || [];
    const cloudTs: ItemTimestamps = data.item_timestamps || {};

    const localBarbarismes: string[] = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const localDialectes: string[] = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    const localTs: ItemTimestamps = getLocalTimestamps();

    // Apply Last Write Wins
    const result = applyLWW(localBarbarismes, localDialectes, localTs, cloudBarbarismes, cloudDialectes, cloudTs);

    // Push merged state to cloud
    const { error: updateError } = await supabase
      .from('users_progress')
      .update({
        progress_data: result.barbarismes,
        dialect_progress: result.dialectes,
        item_timestamps: result.timestamps,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    if (updateError) throw new Error('SERVER_ERROR');

    // Save merged state locally
    localStorage.setItem('doneBarbarismes', JSON.stringify(result.barbarismes));
    localStorage.setItem('doneDialectes', JSON.stringify(result.dialectes));
    saveLocalTimestamps(result.timestamps);

    return { barbarismes: result.barbarismes, dialectes: result.dialectes };
  },

  // Push local timestamps to cloud without doing a full LWW pull (background push after each toggle)
  async pushChange(email: string): Promise<void> {
    if (!navigator.onLine || !isSupabaseConfigured() || !supabase) return;

    const localBarbarismes: string[] = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const localDialectes: string[] = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    const localTs: ItemTimestamps = getLocalTimestamps();

    // Pull cloud timestamps only (not full arrays) for LWW
    const { data, error } = await supabase
      .from('users_progress')
      .select('progress_data, dialect_progress, item_timestamps')
      .eq('email', email)
      .single();

    if (error) return; // silent fail on background push

    const cloudTs: ItemTimestamps = data.item_timestamps || {};
    const result = applyLWW(
      localBarbarismes, localDialectes, localTs,
      data.progress_data || [], data.dialect_progress || [], cloudTs,
    );

    await supabase
      .from('users_progress')
      .update({
        progress_data: result.barbarismes,
        dialect_progress: result.dialectes,
        item_timestamps: result.timestamps,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    // Also apply LWW result locally (another device may have made changes)
    localStorage.setItem('doneBarbarismes', JSON.stringify(result.barbarismes));
    localStorage.setItem('doneDialectes', JSON.stringify(result.dialectes));
    saveLocalTimestamps(result.timestamps);
  },

  // Delete account and all data from Supabase
  async deleteAccount(email: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;
    try {
      const { error } = await supabase
        .from('users_progress')
        .delete()
        .eq('email', email);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  },
};

// Subscribe to realtime changes for this user's row
// Returns an unsubscribe function
export function subscribeRealtime(email: string, onRemoteChange: () => void): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {};

  const channel = supabase
    .channel(`progress:${email}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users_progress',
        filter: `email=eq.${email}`,
      },
      () => {
        onRemoteChange();
      }
    )
    .subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const email = localStorage.getItem('fets_current_email');
    if (email) {
      cloudSync.pushChange(email).catch(() => {});
    }
  });
}
