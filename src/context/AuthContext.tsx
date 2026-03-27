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
  requestOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: Error | null }>;
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

  const requestOtp = async (email: string) => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
      
      const { error: dbError } = await supabase.from('otp_sessions').insert({
        email,
        code,
        expires_at: expiresAt,
        verified: false
      });
      
      if (dbError) return { error: dbError };

      const resendKey = import.meta.env.VITE_RESEND_API_KEY;
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Codi de verificació - Barbarismes',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px">
              <h2 style="color:#dc2626">Codi de verificació</h2>
              <p>Introdueix aquest codi a l'aplicació:</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin:16px 0">
                <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#dc2626">${code}</span>
              </div>
              <p style="color:#666;font-size:13px">Expira en 10 minuts. Si no has fet aquesta sol·licitud, ignora aquest correu.</p>
            </div>
          `
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({ message: 'Error desconegut' }));
        return { error: new Error(errorData.message || 'Error enviant email') };
      }

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const { data, error } = await supabase
        .from('otp_sessions')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data?.length) {
        return { error: new Error('Codi incorrecte o expirat') };
      }

      const session = data[0];
      
      await supabase
        .from('otp_sessions')
        .update({ verified: true })
        .eq('id', session.id);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-16),
        options: { 
          data: { email },
          emailRedirectTo: window.location.origin 
        }
      });

      if (signUpError?.status === 422) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: 'otp_login'
        });
        if (signInError) {
          const { error: updateError } = await supabase.auth.updateUser({ password: Math.random().toString(36).slice(-16) });
          if (updateError) return { error: updateError };
        }
      }

      return { error: null };
    } catch (e) {
      return { error: e as Error };
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
    <AuthContext.Provider value={{ user, session, loading, isOnline, requestOtp, verifyOtp, signOut, syncNow }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
