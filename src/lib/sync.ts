import { supabase } from './supabase';

const OFFLINE_QUEUE_KEY = 'offlineSyncQueue';

interface QueueItem {
  id: string;
  operation: 'add' | 'remove';
  itemId: string;
  itemType: 'barbarisme' | 'dialecte';
  timestamp: number;
}

export function getOfflineQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: QueueItem[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(operation: 'add' | 'remove', itemId: string, itemType: 'barbarisme' | 'dialecte' = 'barbarisme'): void {
  const queue = getOfflineQueue();
  queue.push({
    id: crypto.randomUUID(),
    operation,
    itemId,
    itemType,
    timestamp: Date.now()
  });
  saveOfflineQueue(queue);
  
  if (navigator.onLine) {
    processOfflineQueue();
  }
}

export async function processOfflineQueue(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const { data: progress } = await supabase
    .from('user_progress')
    .select('done_barbarismes, done_dialectes')
    .eq('user_id', user.id)
    .single();

  let barbarismes = new Set<string>(progress?.done_barbarismes || []);
  let dialectes = new Set<string>(progress?.done_dialectes || []);

  for (const item of queue) {
    const targetSet = item.itemType === 'dialecte' ? dialectes : barbarismes;
    if (item.operation === 'add') {
      targetSet.add(item.itemId);
    } else {
      targetSet.delete(item.itemId);
    }
  }

  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      email: user.email,
      done_barbarismes: Array.from(barbarismes),
      done_dialectes: Array.from(dialectes),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (!error) {
    saveOfflineQueue([]);
  }
}

export async function syncFromCloud(): Promise<{ barbarismes: string[]; dialectes: string[] } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_progress')
    .select('done_barbarismes, done_dialectes')
    .eq('user_id', user.id)
    .single();

  return data ? {
    barbarismes: data.done_barbarismes || [],
    dialectes: data.done_dialectes || []
  } : null;
}

export async function syncToCloud(barbarismes: string[], dialectes: string[]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      email: user.email,
      done_barbarismes: barbarismes,
      done_dialectes: dialectes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  return !error;
}
