import { supabase, isSupabaseConfigured } from './supabase';

// Types
export interface UserProgress {
  email: string;
  display_name: string;
  progress_data: string[]; // barbarismes done
  dialect_progress: string[]; // dialectes done
  last_sync_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id?: string;
  user_email: string;
  operation_type: 'add' | 'remove';
  item_type: 'barbarisme' | 'dialecte';
  item_key: string;
  item_value?: unknown;
  timestamp: string;
  synced: boolean;
  device_id: string;
}

// Generate unique device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('fets_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('fets_device_id', deviceId);
  }
  return deviceId;
};

// Local queue for offline support
const LOCAL_QUEUE_KEY = 'fets_sync_queue';

const getLocalQueue = (): SyncQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveLocalQueue = (queue: SyncQueueItem[]): void => {
  localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
};

const addToLocalQueue = (item: Omit<SyncQueueItem, 'id' | 'device_id' | 'synced'>): void => {
  const queue = getLocalQueue();
  queue.push({
    ...item,
    device_id: getDeviceId(),
    synced: false,
  });
  saveLocalQueue(queue);
};

// Check online status
const isOnline = (): boolean => navigator.onLine;

// Cloud Sync Service
export const cloudSync = {
  // Validate email format
  validateEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9]{1,8}\.santignasi@fje\.edu$/;
    return pattern.test(email);
  },

  // Get or create user
  async getOrCreateUser(email: string): Promise<UserProgress | null> {
    console.log('[v0] getOrCreateUser called with:', email);
    console.log('[v0] Supabase configured:', isSupabaseConfigured());
    
    // If Supabase not configured, work in offline mode
    if (!isSupabaseConfigured() || !supabase) {
      console.log('[v0] Working in offline mode (no Supabase)');
      // Return a local user object for offline mode
      return {
        email,
        display_name: email.split('.')[0].toUpperCase(),
        progress_data: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
        dialect_progress: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    try {
      console.log('[v0] Checking if user exists in Supabase...');
      // Check if user exists
      const { data: existing, error: fetchError } = await supabase
        .from('users_progress')
        .select('*')
        .eq('email', email)
        .single();

      console.log('[v0] Fetch result:', existing, 'Error:', fetchError);

      if (existing && !fetchError) {
        return {
          email: existing.email,
          display_name: existing.display_name || email.split('.')[0],
          progress_data: existing.progress_data || [],
          dialect_progress: existing.dialect_progress || [],
          last_sync_at: existing.last_sync_at,
          updated_at: existing.updated_at,
        };
      }

      // Create new user
      console.log('[v0] User not found, creating new user...');
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

      console.log('[v0] Insert result:', newUser, 'Error:', insertError);

      if (insertError) throw insertError;

      return {
        email: newUser.email,
        display_name: newUser.display_name,
        progress_data: newUser.progress_data || [],
        dialect_progress: newUser.dialect_progress || [],
        last_sync_at: newUser.last_sync_at,
        updated_at: newUser.updated_at,
      };
    } catch (error) {
      console.error('[v0] Error getting/creating user:', error);
      // Fallback to offline mode
      return {
        email,
        display_name: email.split('.')[0].toUpperCase(),
        progress_data: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
        dialect_progress: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  // Load progress from cloud
  async loadProgress(email: string): Promise<{ barbarismes: string[]; dialectes: string[] } | null> {
    // If no Supabase, return local progress
    if (!isSupabaseConfigured() || !supabase) {
      return {
        barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
        dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
      };
    }

    try {
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
    } catch (error) {
      console.error('[v0] Error loading progress:', error);
      // Fallback to local
      return {
        barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
        dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
      };
    }
  },

  // Save progress to cloud
  async saveProgress(email: string, barbarismes: string[], dialectes: string[]): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return false;

    try {
      const { error } = await supabase
        .from('users_progress')
        .update({
          progress_data: barbarismes,
          dialect_progress: dialectes,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[CloudSync] Error saving progress:', error);
      return false;
    }
  },

  // Queue a change (for offline support)
  queueChange(
    email: string,
    operation: 'add' | 'remove',
    itemType: 'barbarisme' | 'dialecte',
    itemKey: string
  ): void {
    addToLocalQueue({
      user_email: email,
      operation_type: operation,
      item_type: itemType,
      item_key: itemKey,
      timestamp: new Date().toISOString(),
    });

    // Try to sync immediately if online
    if (isOnline()) {
      this.processQueue(email);
    }
  },

  // Process offline queue with conflict resolution
  async processQueue(email: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase || !isOnline()) return;

    const queue = getLocalQueue().filter(item => item.user_email === email && !item.synced);
    if (queue.length === 0) return;

    try {
      // Get current cloud state
      const cloudProgress = await this.loadProgress(email);
      if (!cloudProgress) return;

      // Get local state
      const localBarbarismes = new Set<string>(
        JSON.parse(localStorage.getItem('doneBarbarismes') || '[]')
      );
      const localDialectes = new Set<string>(
        JSON.parse(localStorage.getItem('doneDialectes') || '[]')
      );

      // Merge with cloud state (union for adds, apply removes)
      const cloudBarbarismes = new Set(cloudProgress.barbarismes);
      const cloudDialectes = new Set(cloudProgress.dialectes);

      // Apply local queue changes
      for (const item of queue) {
        const targetSet = item.item_type === 'barbarisme' 
          ? (item.operation_type === 'add' ? localBarbarismes : cloudBarbarismes)
          : (item.operation_type === 'add' ? localDialectes : cloudDialectes);

        if (item.operation_type === 'add') {
          cloudBarbarismes.add(item.item_key);
          cloudDialectes.add(item.item_key);
        } else {
          cloudBarbarismes.delete(item.item_key);
          cloudDialectes.delete(item.item_key);
        }
      }

      // Conflict resolution: union merge (keep all items from both)
      const mergedBarbarismes = Array.from(new Set([...cloudBarbarismes, ...localBarbarismes]));
      const mergedDialectes = Array.from(new Set([...cloudDialectes, ...localDialectes]));

      // Save merged state
      await this.saveProgress(email, mergedBarbarismes, mergedDialectes);

      // Update local storage
      localStorage.setItem('doneBarbarismes', JSON.stringify(mergedBarbarismes));
      localStorage.setItem('doneDialectes', JSON.stringify(mergedDialectes));

      // Clear processed queue
      const remainingQueue = getLocalQueue().filter(
        item => item.user_email !== email || item.synced
      );
      saveLocalQueue(remainingQueue);

    } catch (error) {
      console.error('[CloudSync] Error processing queue:', error);
    }
  },

  // Force sync (pull from cloud)
  async forceSync(email: string): Promise<{ barbarismes: string[]; dialectes: string[] } | null> {
    if (!isOnline()) return null;

    // Process any pending changes first
    await this.processQueue(email);

    // Then load from cloud
    return this.loadProgress(email);
  },

  // Get pending changes count
  getPendingChangesCount(email: string): number {
    return getLocalQueue().filter(item => item.user_email === email && !item.synced).length;
  },
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const email = localStorage.getItem('fets_current_email');
    if (email) {
      cloudSync.processQueue(email);
    }
  });
}
