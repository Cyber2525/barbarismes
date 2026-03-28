import { cloudSync, recordLocalChange } from '../lib/cloudSync';

const DONE_ITEMS_KEY = 'doneBarbarismes';
const DONE_DIALECTES_KEY = 'doneDialectes';

// Custom event so components re-render on progress change
export const PROGRESS_UPDATED_EVENT = 'fets-progress-updated';

export function dispatchProgressUpdate() {
  window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT));
}

const getCurrentEmail = (): string | null =>
  localStorage.getItem('fets_current_email');

// Debounced background push (only when logged in)
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedPush = () => {
  const email = getCurrentEmail();
  if (!email) return;
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    cloudSync.pushChange(email).catch(() => {});
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
  recordLocalChange(`b:${barbarism}`, true);
  saveDoneItems(done);
}

export function unmarkAsDone(barbarism: string): void {
  const done = getDoneItems();
  done.delete(barbarism);
  recordLocalChange(`b:${barbarism}`, false);
  saveDoneItems(done);
}

export function toggleDone(barbarism: string): boolean {
  const done = getDoneItems();
  if (done.has(barbarism)) {
    done.delete(barbarism);
    recordLocalChange(`b:${barbarism}`, false);
    saveDoneItems(done);
    return false;
  } else {
    done.add(barbarism);
    recordLocalChange(`b:${barbarism}`, true);
    saveDoneItems(done);
    return true;
  }
}

export function markManyAsDone(barbarisms: string[]): void {
  const done = getDoneItems();
  const now = new Date().toISOString();
  barbarisms.forEach(b => {
    done.add(b);
    recordLocalChange(`b:${b}`, true);
  });
  saveDoneItems(done);
}

export function markDialecteAsDone(dialecte: string): void {
  const done = getDoneDialectes();
  done.add(dialecte);
  recordLocalChange(`d:${dialecte}`, true);
  saveDoneDialectes(done);
}

export function unmarkDialecteAsDone(dialecte: string): void {
  const done = getDoneDialectes();
  done.delete(dialecte);
  recordLocalChange(`d:${dialecte}`, false);
  saveDoneDialectes(done);
}

export function toggleDialecteDone(dialecte: string): boolean {
  const done = getDoneDialectes();
  if (done.has(dialecte)) {
    done.delete(dialecte);
    recordLocalChange(`d:${dialecte}`, false);
    saveDoneDialectes(done);
    return false;
  } else {
    done.add(dialecte);
    recordLocalChange(`d:${dialecte}`, true);
    saveDoneDialectes(done);
    return true;
  }
}
