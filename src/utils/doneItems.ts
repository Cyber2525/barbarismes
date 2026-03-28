import { addToOfflineQueue } from '../lib/sync';

const DONE_ITEMS_KEY = 'doneBarbarismes';

export function getDoneItems(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_ITEMS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveDoneItems(done: Set<string>): void {
  localStorage.setItem(DONE_ITEMS_KEY, JSON.stringify(Array.from(done)));
}

export function markAsDone(barbarism: string): void {
  const done = getDoneItems();
  done.add(barbarism);
  saveDoneItems(done);
  addToOfflineQueue('add', barbarism, 'barbarisme');
}

export function unmarkAsDone(barbarism: string): void {
  const done = getDoneItems();
  done.delete(barbarism);
  saveDoneItems(done);
  addToOfflineQueue('remove', barbarism, 'barbarisme');
}

export function toggleDone(barbarism: string): boolean {
  const done = getDoneItems();
  if (done.has(barbarism)) {
    done.delete(barbarism);
    saveDoneItems(done);
    addToOfflineQueue('remove', barbarism, 'barbarisme');
    return false;
  } else {
    done.add(barbarism);
    saveDoneItems(done);
    addToOfflineQueue('add', barbarism, 'barbarisme');
    return true;
  }
}

export function markManyAsDone(barbarisms: string[]): void {
  const done = getDoneItems();
  barbarisms.forEach(b => {
    done.add(b);
    addToOfflineQueue('add', b, 'barbarisme');
  });
  saveDoneItems(done);
}
