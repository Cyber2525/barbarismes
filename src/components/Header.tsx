import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff, Download, Upload } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';
import { downloadCSI, readCSIFile, mergeCSIData, CSIData } from '../lib/csiExport';

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
  const [pendingChanges, setPendingChanges] = useState(0);

  // Login form state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const loginRef = useRef<HTMLDivElement>(null);

  // User menu state (when logged in)
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Import state
  const [pendingImport, setPendingImport] = useState<CSIData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (currentUser) {
      setPendingChanges(cloudSync.getPendingChangesCount(currentUser));
    }
  }, [currentUser, syncStatus]);

  // Close login form on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setShowLoginForm(false);
      }
    };
    if (showLoginForm) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLoginForm]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && currentUser && pendingChanges > 0) {
      handleSync();
    }
  }, [isOnline]);

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
    setShowUserMenu(false);
    setSyncStatus('idle');
  };

  const handleSync = async () => {
    if (!currentUser || !isOnline) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const localBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const localDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
      await cloudSync.saveProgress(currentUser, localBarbarismes, localDialectes);
      await cloudSync.processQueue(currentUser);
      const progress = await cloudSync.loadProgress(currentUser);
      if (progress) {
        localStorage.setItem('doneBarbarismes', JSON.stringify(progress.barbarismes));
        localStorage.setItem('doneDialectes', JSON.stringify(progress.dialectes));
        onProgressUpdate(progress.barbarismes, progress.dialectes);
      }
      setSyncStatus('success');
      setPendingChanges(0);
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleExport = () => {
    const barbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    downloadCSI(currentUser, barbarismes, dialectes);
    setShowUserMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowUserMenu(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readCSIFile(file);
    if (data) {
      setPendingImport(data);
    } else {
      alert('Error llegint el fitxer CSI');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    const existing = {
      barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
      dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
    };
    const newData = mode === 'merge'
      ? mergeCSIData(existing, pendingImport)
      : { barbarismes: pendingImport.barbarismes, dialectes: pendingImport.dialectes };

    localStorage.setItem('doneBarbarismes', JSON.stringify(newData.barbarismes));
    localStorage.setItem('doneDialectes', JSON.stringify(newData.dialectes));

    if (currentUser && isOnline) {
      await cloudSync.saveProgress(currentUser, newData.barbarismes, newData.dialectes);
    }
    onProgressUpdate(newData.barbarismes, newData.dialectes);
    setPendingImport(null);
  };

  const displayName = currentUser ? currentUser.split('.')[0].toUpperCase() : null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/30 shadow-lg">
        <div className="container mx-auto px-0 py-3 flex items-center justify-between h-16">
          <h1 className="text-lg md:text-xl font-bold text-red-600 pl-4">Català CSI</h1>

          <div className="flex items-center gap-0 pr-4">
            {/* --- NOT LOGGED IN: Login button --- */}
            {!currentUser && (
              <div ref={loginRef} className="relative">
                <button
                  onClick={() => setShowLoginForm(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium ${showLoginForm ? 'bg-red-700 rounded-2xl' : 'bg-red-600 rounded-lg hover:bg-red-700'}`}
                >
                  <LogIn size={16} />
                  Login
                </button>

                {showLoginForm && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Iniciar sessió</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email CSI</label>
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value.toLowerCase());
                            if (emailError) validateEmail(e.target.value.toLowerCase());
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && email && !isSyncing) handleLogin(); }}
                          placeholder="12345678.santignasi@fje.edu"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${emailError ? 'border-red-500' : 'border-gray-300'}`}
                          autoFocus
                        />
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                      </div>
                      <button
                        onClick={handleLogin}
                        disabled={isSyncing || !email}
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm"
                      >
                        {isSyncing ? <RefreshCw size={15} className="animate-spin" /> : <LogIn size={15} />}
                        Entrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- LOGGED IN: status + user button --- */}
            {currentUser && (
              <>
                {/* User menu button */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${showUserMenu ? 'bg-red-700 text-white rounded-2xl' : 'bg-red-600 text-white rounded-lg hover:bg-red-700'}`}
                  >
                    {isOnline ? <Cloud size={15} /> : <CloudOff size={15} />}
                    <span>{displayName}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
                      <p className="text-sm font-semibold text-gray-800 mb-3">Opcions de sincronització</p>
                      <div className="space-y-3">
                        <div className="text-xs bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 truncate"><strong>Email:</strong> {currentUser}</p>
                          <p className="text-gray-500 mt-1 flex items-center gap-1">
                            {isOnline
                              ? <span className="text-green-600 flex items-center gap-1"><Cloud size={12} /> Online</span>
                              : <span className="text-yellow-600 flex items-center gap-1"><CloudOff size={12} /> Offline</span>
                            }
                          </p>
                          {pendingChanges > 0 && (
                            <p className="text-xs text-yellow-600 mt-1">⚠️ {pendingChanges} canvis pendents</p>
                          )}
                        </div>
                        <button
                          onClick={() => { handleSync(); setShowUserMenu(false); }}
                          disabled={isSyncing || !isOnline}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                          Sincronitzar ara
                        </button>
                        <button
                          onClick={handleExport}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <Download size={14} />
                          Exportar (.csi)
                        </button>
                        <button
                          onClick={handleImportClick}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Upload size={14} />
                          Importar (.csi)
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <LogOut size={14} />
                          Tancar sessió
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csi" onChange={handleFileSelect} className="hidden" />

      {/* Import dialog */}
      {pendingImport && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Importar fitxer CSI</h3>
            <p className="text-sm text-gray-500 mb-4">
              De: <strong>{pendingImport.userName}</strong> &mdash; {pendingImport.barbarismes.length} barbarismes, {pendingImport.dialectes.length} dialectes
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleImportConfirm('merge')}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                Fusionar (conserva tot)
              </button>
              <button
                onClick={() => handleImportConfirm('replace')}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                Substituir (sobreescriu)
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 text-sm transition-colors"
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
