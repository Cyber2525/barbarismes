import { supabase } from './supabase';

export interface SyncQueueItem {
  id: string;
  operation: 'add' | 'remove';
  itemName: string;
  timestamp: number;
  synced: boolean;
}

interface OfflineQueue {
  items: SyncQueueItem[];
}

const OFFLINE_QUEUE_KEY = 'csi-offline-queue';
const LAST_SYNC_KEY = 'csi-last-sync';

/**
 * Get local offline queue
 */
export function getOfflineQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const queue: OfflineQueue = JSON.parse(raw);
    return queue.items || [];
  } catch {
    return [];
  }
}

/**
 * Add operation to offline queue
 */
export function addToOfflineQueue(operation: 'add' | 'remove', itemName: string): void {
  const queue = getOfflineQueue();
  const item: SyncQueueItem = {
    id: `${Date.now()}-${Math.random()}`,
    operation,
    itemName,
    timestamp: Date.now(),
    synced: false
  };
  queue.push(item);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ items: queue }));
}

/**
 * Clear offline queue (after successful sync)
 */
export function clearOfflineQueue(): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ items: [] }));
}

/**
 * Mark item as synced
 */
export function markAsSynced(id: string): void {
  const queue = getOfflineQueue();
  const updated = queue.map(item => 
    item.id === id ? { ...item, synced: true } : item
  );
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ items: updated }));
}

/**
 * Sync offline changes to cloud
 */
export async function syncOfflineQueue(userId: string): Promise<boolean> {
  try {
    const queue = getOfflineQueue();
    if (queue.length === 0) return true;

    // Get current remote state to detect conflicts
    const { data: remoteData, error: fetchError } = await supabase
      .from('user_progress')
      .select('done_items')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    let remoteDoneItems = remoteData?.done_items || [];

    // Apply each operation with conflict detection
    for (const queueItem of queue) {
      if (queueItem.synced) continue;

      if (queueItem.operation === 'add') {
        if (!remoteDoneItems.includes(queueItem.itemName)) {
          remoteDoneItems.push(queueItem.itemName);
        }
      } else if (queueItem.operation === 'remove') {
        remoteDoneItems = remoteDoneItems.filter(item => item !== queueItem.itemName);
      }

      markAsSynced(queueItem.id);
    }

    // Update remote state
    const { error: updateError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        done_items: remoteDoneItems,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) throw updateError;

    // Clear queue after successful sync
    clearOfflineQueue();
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing offline queue:', error);
    return false;
  }
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    return new Date(raw);
  } catch {
    return null;
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Setup online/offline listeners
 */
export function setupSyncListeners(onStatusChange: (isOnline: boolean) => void): () => void {
  const handleOnline = () => onStatusChange(true);
  const handleOffline = () => onStatusChange(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
