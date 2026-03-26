import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  provider: 'google' | 'apple' | 'none';
  lastSyncTime?: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isOnline: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  syncProgress: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          const user_metadata = session.user.user_metadata || {};
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: user_metadata.full_name || session.user.user_metadata?.name,
            provider: (session.user.app_metadata?.provider as 'google' | 'apple') || 'none'
          });
        } else {
          // Try to get from localStorage for offline support
          const savedUser = localStorage.getItem('csi-auth-user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('[Auth] Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user_metadata = session.user.user_metadata || {};
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: user_metadata.full_name || session.user.user_metadata?.name,
          provider: (session.user.app_metadata?.provider as 'google' | 'apple') || 'none'
        };
        setUser(authUser);
        localStorage.setItem('csi-auth-user', JSON.stringify(authUser));
      } else {
        setUser(null);
        localStorage.removeItem('csi-auth-user');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Setup online/offline listeners
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

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('[Auth] Error logging in with Google:', error);
      throw error;
    }
  };

  const loginWithApple = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('[Auth] Error logging in with Apple:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      localStorage.removeItem('csi-auth-user');
    } catch (error) {
      console.error('[Auth] Error logging out:', error);
      throw error;
    }
  };

  const syncProgress = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { syncOfflineQueue } = await import('../lib/sync');
      return await syncOfflineQueue(user.id);
    } catch (error) {
      console.error('[Auth] Error syncing progress:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isOnline, loginWithGoogle, loginWithApple, logout, syncProgress }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
