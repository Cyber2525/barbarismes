export type AuthProvider = 'password' | 'google' | 'apple' | 'passkey';

export interface AuthSession {
  userId: string;
  email: string;
  provider: AuthProvider;
  createdAt: number;
}

export interface FetRecord {
  id: string;
  name: string;
  owner: string;
  updatedAt: number;
}

interface SyncOperation {
  id: string;
  type: 'upsert' | 'delete';
  record?: FetRecord;
  recordId?: string;
  createdAt: number;
}

interface CloudBundle {
  lastSyncedAt: number;
  records: FetRecord[];
}

interface AppUser {
  email: string;
  password: string;
  userId: string;
}

const FETS_KEY = 'fetsRecords';
const QUEUE_KEY = 'fetsSyncQueue';
const LAST_SYNC_KEY = 'fetsLastSyncAt';
const SESSION_KEY = 'fetsAuthSession';
const USERS_KEY = 'fetsAuthUsers';
const MOCK_CLOUD_KEY = 'fetsMockCloud';

const randomId = () => `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getSession = (): AuthSession | null => readJSON<AuthSession | null>(SESSION_KEY, null);

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const loginWithPassword = (email: string, password: string): AuthSession => {
  const users = readJSON<AppUser[]>(USERS_KEY, []);
  const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

  if (existing && existing.password !== password) {
    throw new Error('Contrasenya incorrecta.');
  }

  const target = existing ?? { email, password, userId: randomId() };
  if (!existing) {
    writeJSON(USERS_KEY, [...users, target]);
  }

  const session: AuthSession = {
    userId: target.userId,
    email: target.email,
    provider: 'password',
    createdAt: Date.now()
  };
  writeJSON(SESSION_KEY, session);
  return session;
};

export const loginWithProvider = (provider: 'google' | 'apple'): AuthSession => {
  const pseudoEmail = `${provider}-${randomId().slice(0, 8)}@example.local`;
  const session: AuthSession = {
    userId: randomId(),
    email: pseudoEmail,
    provider,
    createdAt: Date.now()
  };
  writeJSON(SESSION_KEY, session);
  return session;
};

export const loginWithPasskey = async (): Promise<AuthSession> => {
  if (!('PublicKeyCredential' in window) || !navigator.credentials) {
    throw new Error('Aquest dispositiu no suporta passkeys.');
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Català Correcte' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: `passkey-${Date.now()}@local`,
          displayName: 'Passkey local user'
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred'
        },
        timeout: 12000,
        attestation: 'none'
      }
    });
  } catch {
    // If a native dialog is cancelled we still allow a local-only session.
  }

  const session: AuthSession = {
    userId: randomId(),
    email: `passkey-${randomId().slice(0, 8)}@example.local`,
    provider: 'passkey',
    createdAt: Date.now()
  };
  writeJSON(SESSION_KEY, session);
  return session;
};

export const getFets = (): FetRecord[] => readJSON<FetRecord[]>(FETS_KEY, []);

const setFets = (records: FetRecord[]) => {
  writeJSON(FETS_KEY, records);
};

const getQueue = (): SyncOperation[] => readJSON<SyncOperation[]>(QUEUE_KEY, []);

const setQueue = (queue: SyncOperation[]) => {
  writeJSON(QUEUE_KEY, queue);
};

export const getPendingCount = () => getQueue().length;

export const getLastSyncAt = (): number => Number(localStorage.getItem(LAST_SYNC_KEY) || 0);

const enqueue = (operation: SyncOperation) => {
  setQueue([...getQueue(), operation]);
};

export const addOrUpdateFet = (input: Pick<FetRecord, 'id' | 'name' | 'owner'>) => {
  const now = Date.now();
  const records = getFets();
  const record: FetRecord = {
    id: input.id || randomId(),
    name: input.name,
    owner: input.owner,
    updatedAt: now
  };

  const next = records.some((item) => item.id === record.id)
    ? records.map((item) => (item.id === record.id ? record : item))
    : [...records, record];

  setFets(next);
  enqueue({
    id: randomId(),
    type: 'upsert',
    record,
    createdAt: now
  });
};

export const deleteFet = (recordId: string) => {
  const next = getFets().filter((record) => record.id !== recordId);
  setFets(next);
  enqueue({
    id: randomId(),
    type: 'delete',
    recordId,
    createdAt: Date.now()
  });
};

const readCloudBundle = (): CloudBundle => readJSON<CloudBundle>(MOCK_CLOUD_KEY, {
  records: [],
  lastSyncedAt: 0
});

const writeCloudBundle = (bundle: CloudBundle) => {
  writeJSON(MOCK_CLOUD_KEY, bundle);
};

export const syncPendingChanges = async (): Promise<{ synced: number; conflicts: number }> => {
  if (!navigator.onLine) {
    return { synced: 0, conflicts: 0 };
  }

  const queue = getQueue();
  if (!queue.length) {
    return { synced: 0, conflicts: 0 };
  }

  const cloud = readCloudBundle();
  const cloudById = new Map(cloud.records.map((record) => [record.id, record]));

  let conflicts = 0;
  queue.forEach((op) => {
    if (op.type === 'upsert' && op.record) {
      const existing = cloudById.get(op.record.id);
      if (existing && existing.updatedAt > op.record.updatedAt) {
        conflicts += 1;
        return;
      }
      cloudById.set(op.record.id, op.record);
      return;
    }

    if (op.type === 'delete' && op.recordId) {
      cloudById.delete(op.recordId);
    }
  });

  const now = Date.now();
  const newBundle: CloudBundle = {
    lastSyncedAt: now,
    records: [...cloudById.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  };
  writeCloudBundle(newBundle);

  const merged = new Map(newBundle.records.map((record) => [record.id, record]));
  getFets().forEach((local) => {
    const server = merged.get(local.id);
    if (!server || local.updatedAt > server.updatedAt) {
      merged.set(local.id, local);
    }
  });

  setFets([...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt));
  setQueue([]);
  localStorage.setItem(LAST_SYNC_KEY, now.toString());

  return { synced: queue.length, conflicts };
};

export const exportFetsDocument = () => {
  const records = getFets();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    format: '["NAME" / GUEST.csi]',
    entries: records.map((record) => ({
      id: record.id,
      fet: `[\"${record.name}\" / ${record.owner}]`,
      name: record.name,
      owner: record.owner,
      updatedAt: record.updatedAt
    }))
  };
};

export const importFetsDocument = (data: unknown, mode: 'merge' | 'replace') => {
  const payload = data as { entries?: Array<{ id?: string; name?: string; owner?: string; fet?: string; updatedAt?: number }> };
  const imported: FetRecord[] = (payload.entries || [])
    .map((entry) => {
      let name = entry.name || '';
      let owner = entry.owner || '';

      if ((!name || !owner) && entry.fet) {
        const match = entry.fet.match(/\[\"(.+?)\"\s*\/\s*(.+?)\]/);
        if (match) {
          name = name || match[1];
          owner = owner || match[2];
        }
      }

      if (!name || !owner) {
        return null;
      }

      return {
        id: entry.id || randomId(),
        name,
        owner,
        updatedAt: entry.updatedAt || Date.now()
      };
    })
    .filter((record): record is FetRecord => Boolean(record));

  const current = getFets();
  const result = mode === 'replace' ? imported : [...current, ...imported].reduce<FetRecord[]>((acc, record) => {
    const existingIndex = acc.findIndex((item) => item.id === record.id);
    if (existingIndex === -1) {
      acc.push(record);
      return acc;
    }

    if (acc[existingIndex].updatedAt <= record.updatedAt) {
      acc[existingIndex] = record;
    }
    return acc;
  }, []);

  setFets(result.sort((a, b) => b.updatedAt - a.updatedAt));

  imported.forEach((record) => {
    enqueue({
      id: randomId(),
      type: 'upsert',
      record,
      createdAt: Date.now()
    });
  });

  return imported.length;
};
