import { useState, useRef } from 'react';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';

interface HeaderProps {
  onProgressUpdate: (barbarismes: string[], dialectes: string[]) => void;
}

export function Header({ onProgressUpdate }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<string | null>(() => 
    localStorage.getItem('fets_current_email')
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  useState(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const validateEmail = (value: string): boolean => {
    if (!cloudSync.validateEmail(value)) {
      setEmailError('Format: XXXXXXXX.santignasi@fje.edu (max 8 chars)');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validateEmail(email)) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const user = await cloudSync.getOrCreateUser(email);
      if (user) {
        localStorage.setItem('fets_current_email', email);
        setCurrentUser(email);
        setShowLoginForm(false);
        setEmail('');

        // Load cloud progress
        const progress = await cloudSync.loadProgress(email);
        if (progress) {
          localStorage.setItem('doneBarbarismes', JSON.stringify(progress.barbarismes));
          localStorage.setItem('doneDialectes', JSON.stringify(progress.dialectes));
          onProgressUpdate(progress.barbarismes, progress.dialectes);
        }

        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fets_current_email');
    setCurrentUser(null);
    setEmail('');
    setShowLoginForm(false);
    setSyncStatus('idle');
  };

  const displayName = currentUser ? currentUser.split('.')[0].toUpperCase() : null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-red-800">Català CSI</h1>
          
          <div className="flex items-center gap-3">
            {/* Online Status */}
            {currentUser && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                {isOnline ? (
                  <Wifi size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-yellow-500" />
                )}
              </div>
            )}

            {/* Sync Status */}
            {currentUser && syncStatus !== 'idle' && (
              <div className="flex items-center gap-1 text-xs">
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                  </>
                )}
                {syncStatus === 'success' && (
                  <CheckCircle size={14} className="text-green-500" />
                )}
                {syncStatus === 'error' && (
                  <AlertCircle size={14} className="text-red-500" />
                )}
              </div>
            )}

            {/* Login Button Area */}
            {!currentUser ? (
              <>
                <button
                  onClick={() => setShowLoginForm(!showLoginForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <LogIn size={16} />
                  <span className="text-sm">Login</span>
                </button>

                {/* Login Form Dropdown */}
                {showLoginForm && (
                  <div className="absolute top-full right-4 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email CSI
                        </label>
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value.toLowerCase());
                            if (emailError) validateEmail(e.target.value.toLowerCase());
                          }}
                          placeholder="12345678.santignasi@fje.edu"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            emailError ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {emailError && (
                          <p className="text-xs text-red-500 mt-1">{emailError}</p>
                        )}
                      </div>
                      <button
                        onClick={handleLogin}
                        disabled={isSyncing || !email}
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSyncing ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <LogIn size={16} />
                        )}
                        Login
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden md:inline">
                  {displayName}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <LogOut size={16} />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to offset fixed header */}
      <div className="h-16"></div>
    </>
  );
}
