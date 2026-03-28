import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, Download, Upload, CheckCircle, AlertCircle, Wifi, WifiOff, User } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [pendingImport, setPendingImport] = useState<CSIData | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  useEffect(() => {
    if (currentUser) {
      setPendingChanges(cloudSync.getPendingChangesCount(currentUser));
    }
  }, [currentUser, syncStatus]);

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
        setShowPanel(false);
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
    setShowPanel(false);
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
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readCSIFile(file);
    if (data) {
      setPendingImport(data);
      setShowPanel(false);
    } else {
      alert('Error reading CSI file');
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-red-800">Català CSI</h1>

          <div ref={dropdownRef} className="relative flex items-center gap-2">
            {/* Connection indicator when logged in */}
            {currentUser && (
              <div className="flex items-center gap-1">
                {isOnline
                  ? <Wifi size={15} className="text-green-500" />
                  : <WifiOff size={15} className="text-yellow-500" />
                }
              </div>
            )}

            {/* Sync spinner / status dot */}
            {currentUser && syncStatus !== 'idle' && (
              <span>
                {syncStatus === 'syncing' && <RefreshCw size={14} className="animate-spin text-blue-500" />}
                {syncStatus === 'success' && <CheckCircle size={14} className="text-green-500" />}
                {syncStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}
              </span>
            )}

            {/* Pending badge */}
            {currentUser && pendingChanges > 0 && (
              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {pendingChanges}
              </span>
            )}

            {/* Main button */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentUser
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {currentUser ? (
                <>
                  <User size={16} />
                  <span className="hidden sm:inline">{displayName}</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Login</span>
                </>
              )}
            </button>

            {/* Dropdown panel */}
            {showPanel && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                {/* Panel header */}
                <div className="bg-red-600 text-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {currentUser ? `Hola, ${displayName}` : 'Iniciar sessió'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-red-200">
                      {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                      <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  {currentUser && (
                    <p className="text-xs text-red-200 mt-0.5 truncate">{currentUser}</p>
                  )}
                </div>

                <div className="p-4">
                  {!currentUser ? (
                    /* Login form */
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && email && !isSyncing) handleLogin();
                          }}
                          placeholder="12345678.santignasi@fje.edu"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            emailError ? 'border-red-400' : 'border-gray-300'
                          }`}
                          autoFocus
                        />
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                      </div>
                      <button
                        onClick={handleLogin}
                        disabled={isSyncing || !email}
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      >
                        {isSyncing
                          ? <RefreshCw size={15} className="animate-spin" />
                          : <LogIn size={15} />
                        }
                        Entrar
                      </button>
                    </div>
                  ) : (
                    /* Logged-in actions */
                    <div className="space-y-2">
                      {pendingChanges > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                          {pendingChanges} canvi(s) pendent(s)
                        </div>
                      )}
                      <button
                        onClick={handleSync}
                        disabled={isSyncing || !isOnline}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                        Sincronitzar
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleExport}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={15} />
                          Exportar
                        </button>
                        <button
                          onClick={handleImportClick}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Upload size={15} />
                          Importar
                        </button>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <LogOut size={15} />
                        Tancar sessió
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16" />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csi" onChange={handleFileSelect} className="hidden" />

      {/* Import confirm dialog */}
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
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Combinar (conserva els dos)
              </button>
              <button
                onClick={() => handleImportConfirm('replace')}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Substituir (sobreescriu)
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
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
