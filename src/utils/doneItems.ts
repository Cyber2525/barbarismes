import { cloudSync } from '../lib/cloudSync';

const DONE_ITEMS_KEY = 'doneBarbarismes';
const DONE_DIALECTES_KEY = 'doneDialectes';

// Custom event for progress updates - components can listen to this
export const PROGRESS_UPDATED_EVENT = 'fets-progress-updated';

// Dispatch event to notify components that progress changed
export function dispatchProgressUpdate() {
  window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT));
}

// Get current user email
const getCurrentEmail = (): string | null => {
  return localStorage.getItem('fets_current_email');
};

// Push current state to cloud (debounced) — only active changes while logged in
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedPush = () => {
  const email = getCurrentEmail();
  if (!email) return; // not logged in, no push
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const barbarismes = JSON.parse(localStorage.getItem(DONE_ITEMS_KEY) || '[]');
    const dialectes = JSON.parse(localStorage.getItem(DONE_DIALECTES_KEY) || '[]');
    await cloudSync.pushProgress(email, barbarismes, dialectes);
  }, 800);
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
  debouncedPush();
  dispatchProgressUpdate();
}

export function saveDoneDialectes(done: Set<string>): void {
  localStorage.setItem(DONE_DIALECTES_KEY, JSON.stringify(Array.from(done)));
  debouncedPush();
  dispatchProgressUpdate();
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
