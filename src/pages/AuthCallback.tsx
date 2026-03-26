/**
 * Auth callback handler for OAuth redirects
 * This page handles the redirect from Google/Apple OAuth
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract the session from the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (data.session) {
          // Successfully authenticated, redirect to home
          navigate('/');
        } else {
          // No session found, redirect to home (user can login again)
          navigate('/');
        }
      } catch (error) {
        console.error('[Auth Callback] Error:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-yellow-50 to-red-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
}
