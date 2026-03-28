import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, UserProgress } from '../lib/supabase';
import { useAuth } from './AuthContext';

type PendingChange = {
  id: string;
  operation: 'add' | 'remove';
  item_type: 'barbarisme' | 'dialecte';
  item_id: string;
  timestamp: number;
};

interface SyncContextType {
  doneBarbarismes: Set<string>;
  doneDialectes: Set<string>;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  toggleBarbarisme: (id: string) => void;
  toggleDialecte: (id: string) => void;
  markBarbarismeDone: (id: string) => void;
  unmarkBarbarismeDone: (id: string) => void;
  markDialecteDone: (id: string) => void;
  unmarkDialecteDone: (id: string) => void;
  syncNow: () => Promise<void>;
  exportData: (name: string) => string;
  importData: (data: string, mode: 'merge' | 'replace') => Promise<{ success: boolean; error?: string }>;
}

const SyncContext = createContext<SyncContextType | null>(null);

const PENDING_CHANGES_KEY = 'csi_pending_changes';
const LOCAL_BARBARISMES_KEY = 'doneBarbarismes';
const LOCAL_DIALECTES_KEY = 'doneDialectes';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [doneBarbarismes, setDoneBarbarismes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_BARBARISMES_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [doneDialectes, setDoneDialectes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_DIALECTES_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem(PENDING_CHANGES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(LOCAL_BARBARISMES_KEY, JSON.stringify(Array.from(doneBarbarismes)));
  }, [doneBarbarismes]);

  useEffect(() => {
    localStorage.setItem(LOCAL_DIALECTES_KEY, JSON.stringify(Array.from(doneDialectes)));
  }, [doneDialectes]);

  useEffect(() => {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync when coming online or when there are pending changes
  useEffect(() => {
    if (isOnline && user && pendingChanges.length > 0) {
      syncNow();
    }
  }, [isOnline, user]);

  // Initial sync when user logs in
  useEffect(() => {
    if (user && isOnline) {
      syncFromCloud();
    }
  }, [user]);

  const addPendingChange = useCallback((change: Omit<PendingChange, 'id' | 'timestamp'>) => {
    const newChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    setPendingChanges(prev => {
      // Remove conflicting changes for the same item
      const filtered = prev.filter(
        p => !(p.item_type === change.item_type && p.item_id === change.item_id)
      );
      return [...filtered, newChange];
    });
  }, []);

  const syncFromCloud = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching cloud data:', error);
        return;
      }

      if (data) {
        // Merge cloud data with local data
        const cloudBarbarismes = new Set<string>((data.done_barbarismes as string[]) || []);
        const cloudDialectes = new Set<string>((data.done_dialectes as string[]) || []);

        // Apply pending changes on top of cloud data
        pendingChanges.forEach(change => {
          const targetSet = change.item_type === 'barbarisme' ? cloudBarbarismes : cloudDialectes;
          if (change.operation === 'add') {
            targetSet.add(change.item_id);
          } else {
            targetSet.delete(change.item_id);
          }
        });

        setDoneBarbarismes(cloudBarbarismes);
        setDoneDialectes(cloudDialectes);
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Sync from cloud error:', error);
    }
  }, [user, pendingChanges]);

  const syncToCloud = useCallback(async () => {
    if (!user || !isOnline) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('user_progress')
        .update({
          done_barbarismes: Array.from(doneBarbarismes),
          done_dialectes: Array.from(doneDialectes),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error syncing to cloud:', error);
        return;
      }

      // Clear pending changes after successful sync
      setPendingChanges([]);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync to cloud error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, doneBarbarismes, doneDialectes]);

  const syncNow = useCallback(async () => {
    if (!user || !isOnline) return;
    await syncToCloud();
  }, [user, isOnline, syncToCloud]);

  // Debounced sync
  const scheduleSyncToCloud = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      if (isOnline && user) {
        syncToCloud();
      }
    }, 2000); // Sync 2 seconds after last change
  }, [isOnline, user, syncToCloud]);

  const toggleBarbarisme = useCallback((id: string) => {
    setDoneBarbarismes(prev => {
      const newSet = new Set(prev);
      const operation = newSet.has(id) ? 'remove' : 'add';
      if (operation === 'add') {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      
      if (user) {
        addPendingChange({ operation, item_type: 'barbarisme', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const markBarbarismeDone = useCallback((id: string) => {
    setDoneBarbarismes(prev => {
      if (prev.has(id)) return prev;
      const newSet = new Set(prev);
      newSet.add(id);
      
      if (user) {
        addPendingChange({ operation: 'add', item_type: 'barbarisme', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const unmarkBarbarismeDone = useCallback((id: string) => {
    setDoneBarbarismes(prev => {
      if (!prev.has(id)) return prev;
      const newSet = new Set(prev);
      newSet.delete(id);
      
      if (user) {
        addPendingChange({ operation: 'remove', item_type: 'barbarisme', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const toggleDialecte = useCallback((id: string) => {
    setDoneDialectes(prev => {
      const newSet = new Set(prev);
      const operation = newSet.has(id) ? 'remove' : 'add';
      if (operation === 'add') {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      
      if (user) {
        addPendingChange({ operation, item_type: 'dialecte', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const markDialecteDone = useCallback((id: string) => {
    setDoneDialectes(prev => {
      if (prev.has(id)) return prev;
      const newSet = new Set(prev);
      newSet.add(id);
      
      if (user) {
        addPendingChange({ operation: 'add', item_type: 'dialecte', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const unmarkDialecteDone = useCallback((id: string) => {
    setDoneDialectes(prev => {
      if (!prev.has(id)) return prev;
      const newSet = new Set(prev);
      newSet.delete(id);
      
      if (user) {
        addPendingChange({ operation: 'remove', item_type: 'dialecte', item_id: id });
        scheduleSyncToCloud();
      }
      
      return newSet;
    });
  }, [user, addPendingChange, scheduleSyncToCloud]);

  const exportData = useCallback((name: string): string => {
    const exportObj = {
      version: 1,
      name: name || 'GUEST',
      exportedAt: new Date().toISOString(),
      barbarismes: Array.from(doneBarbarismes),
      dialectes: Array.from(doneDialectes),
    };
    return JSON.stringify(exportObj);
  }, [doneBarbarismes, doneDialectes]);

  const importData = useCallback(async (data: string, mode: 'merge' | 'replace'): Promise<{ success: boolean; error?: string }> => {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.version || !Array.isArray(parsed.barbarismes) || !Array.isArray(parsed.dialectes)) {
        return { success: false, error: 'Format de fitxer invàlid' };
      }

      if (mode === 'replace') {
        setDoneBarbarismes(new Set(parsed.barbarismes));
        setDoneDialectes(new Set(parsed.dialectes));
      } else {
        // Merge mode
        setDoneBarbarismes(prev => new Set([...prev, ...parsed.barbarismes]));
        setDoneDialectes(prev => new Set([...prev, ...parsed.dialectes]));
      }

      // Sync to cloud if logged in
      if (user && isOnline) {
        scheduleSyncToCloud();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error llegint el fitxer' };
    }
  }, [user, isOnline, scheduleSyncToCloud]);

  return (
    <SyncContext.Provider
      value={{
        doneBarbarismes,
        doneDialectes,
        isOnline,
        isSyncing,
        lastSyncTime,
        pendingChanges: pendingChanges.length,
        toggleBarbarisme,
        toggleDialecte,
        markBarbarismeDone,
        unmarkBarbarismeDone,
        markDialecteDone,
        unmarkDialecteDone,
        syncNow,
        exportData,
        importData,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
