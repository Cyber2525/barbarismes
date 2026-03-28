import { cloudSync } from '../lib/cloudSync';

const DONE_ITEMS_KEY = 'doneBarbarismes';
const DONE_DIALECTES_KEY = 'doneDialectes';

// Get current user email
const getCurrentEmail = (): string | null => {
  return localStorage.getItem('fets_current_email');
};

// Sync to cloud in background
const syncToCloud = async () => {
  const email = getCurrentEmail();
  console.log('[v0] syncToCloud called, email:', email);
  if (!email) {
    console.log('[v0] No email found, skipping sync');
    return;
  }
  
  const barbarismes = JSON.parse(localStorage.getItem(DONE_ITEMS_KEY) || '[]');
  const dialectes = JSON.parse(localStorage.getItem(DONE_DIALECTES_KEY) || '[]');
  
  console.log('[v0] Syncing to cloud:', barbarismes.length, 'barbarismes,', dialectes.length, 'dialectes');
  const result = await cloudSync.saveProgress(email, barbarismes, dialectes);
  console.log('[v0] Sync result:', result);
};

// Debounced sync to avoid too many API calls
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncToCloud, 1000);
};

export function getDoneItems(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_ITEMS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function getDoneDialectes(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_DIALECTES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveDoneItems(done: Set<string>): void {
  localStorage.setItem(DONE_ITEMS_KEY, JSON.stringify(Array.from(done)));
  debouncedSync();
}

export function saveDoneDialectes(done: Set<string>): void {
  localStorage.setItem(DONE_DIALECTES_KEY, JSON.stringify(Array.from(done)));
  debouncedSync();
}

export function markAsDone(barbarism: string): void {
  const done = getDoneItems();
  done.add(barbarism);
  saveDoneItems(done);
}

export function unmarkAsDone(barbarism: string): void {
  const done = getDoneItems();
  done.delete(barbarism);
  saveDoneItems(done);
}

export function toggleDone(barbarism: string): boolean {
  const done = getDoneItems();
  if (done.has(barbarism)) {
    done.delete(barbarism);
    saveDoneItems(done);
    return false;
  } else {
    done.add(barbarism);
    saveDoneItems(done);
    return true;
  }
}

export function markManyAsDone(barbarisms: string[]): void {
  const done = getDoneItems();
  barbarisms.forEach(b => done.add(b));
  saveDoneItems(done);
}

// Dialect helpers
export function markDialecteAsDone(dialecte: string): void {
  const done = getDoneDialectes();
  done.add(dialecte);
  saveDoneDialectes(done);
}

export function unmarkDialecteAsDone(dialecte: string): void {
  const done = getDoneDialectes();
  done.delete(dialecte);
  saveDoneDialectes(done);
}

export function toggleDialecteDone(dialecte: string): boolean {
  const done = getDoneDialectes();
  if (done.has(dialecte)) {
    done.delete(dialecte);
    saveDoneDialectes(done);
    return false;
  } else {
    done.add(dialecte);
    saveDoneDialectes(done);
    return true;
  }
}
