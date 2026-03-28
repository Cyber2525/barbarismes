import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  isLoading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const EMAIL_PATTERN = /^\d+\.santignasi@fje\.edu$/;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('csi_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('csi_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return { success: false, error: 'Format d\'email invàlid. Utilitza <numero>.santignasi@fje.edu' };
    }

    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user:', fetchError);
        return { success: false, error: 'Error de connexió. Intenta-ho de nou.' };
      }

      let userData: { id: string; email: string };

      if (existingUser) {
        // User exists - login
        userData = { id: existingUser.user_id, email: existingUser.email };
      } else {
        // Create new user
        const userId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            email: normalizedEmail,
            done_barbarismes: [],
            done_dialectes: [],
          });

        if (insertError) {
          console.error('Error creating user:', insertError);
          return { success: false, error: 'Error creant l\'usuari. Intenta-ho de nou.' };
        }

        userData = { id: userId, email: normalizedEmail };
      }

      setUser(userData);
      localStorage.setItem('csi_user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Error de connexió. Intenta-ho de nou.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('csi_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
