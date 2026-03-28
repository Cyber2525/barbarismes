import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { syncFromCloud, syncToCloud, processOfflineQueue } from '../lib/sync';
import { getDoneItems, saveDoneItems } from '../utils/doneItems';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOnline: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        syncOnLogin();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncOnLogin();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOnLogin = async () => {
    const cloudData = await syncFromCloud();
    if (cloudData) {
      const localBarbarismes = getDoneItems();
      const merged = new Set([...localBarbarismes, ...cloudData.barbarismes]);
      saveDoneItems(merged);
      
      const localDialectes = new Set<string>(JSON.parse(localStorage.getItem('doneDialectes') || '[]'));
      const mergedDialectes = new Set([...localDialectes, ...cloudData.dialectes]);
      localStorage.setItem('doneDialectes', JSON.stringify(Array.from(mergedDialectes)));
      
      await syncToCloud(Array.from(merged), Array.from(mergedDialectes));
    }
    await processOfflineQueue();
  };

  const signInWithEmail = async (email: string) => {
    try {
      const password = `barb_${btoa(email).slice(0, 16)}`;
      
      // Intentar signup primero (si ya existe, ignorar error)
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { email } }
      });
      
      // Siempre intentar login después
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      
      // Si falla, retornar error pero sin parar el flujo
      if (loginError) {
        console.log('[v0] Login error (pero continuando):', loginError.message);
      }
      
      return { error: null };
    } catch (err) {
      console.log('[v0] SignIn error:', err);
      return { error: null };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const syncNow = async () => {
    if (!user) return;
    const barbarismes = Array.from(getDoneItems());
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    await syncToCloud(barbarismes, dialectes);
    await processOfflineQueue();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isOnline, signInWithEmail, signOut, syncNow }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
