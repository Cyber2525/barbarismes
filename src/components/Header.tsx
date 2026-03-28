import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Download, Upload } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';
import { downloadCSI, readCSIFile, mergeCSIData, CSIData } from '../lib/csiExport';

interface HeaderProps {
  onProgressUpdate: (barbarismes: string[], dialectes: string[]) => void;
}

// Cloud progress for merge dialog
interface CloudProgress {
  barbarismes: string[];
  dialectes: string[];
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

  // Login merge/replace dialog
  const [pendingLoginMerge, setPendingLoginMerge] = useState<{ email: string; cloud: CloudProgress; local: CloudProgress } | null>(null);

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
        const cloudProgress = await cloudSync.loadProgress(email);
        const localBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
        const localDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
        
        const cloudHasData = cloudProgress && (cloudProgress.barbarismes.length > 0 || cloudProgress.dialectes.length > 0);
        const localHasData = localBarbarismes.length > 0 || localDialectes.length > 0;

        // If both cloud and local have data, ask user what to do
        if (cloudHasData && localHasData) {
          setShowLoginForm(false);
          setPendingLoginMerge({
            email,
            cloud: cloudProgress!,
            local: { barbarismes: localBarbarismes, dialectes: localDialectes }
          });
          setIsSyncing(false);
          setSyncStatus('idle');
          return;
        }

        // Otherwise, auto-resolve
        localStorage.setItem('fets_current_email', email);
        setCurrentUser(email);
        setShowLoginForm(false);
        setEmail('');

        if (cloudHasData) {
          // Cloud has data, local empty -> use cloud
          localStorage.setItem('doneBarbarismes', JSON.stringify(cloudProgress!.barbarismes));
          localStorage.setItem('doneDialectes', JSON.stringify(cloudProgress!.dialectes));
          onProgressUpdate(cloudProgress!.barbarismes, cloudProgress!.dialectes);
        } else if (localHasData) {
          // Local has data, cloud empty -> push local to cloud
          await cloudSync.saveProgress(email, localBarbarismes, localDialectes);
          onProgressUpdate(localBarbarismes, localDialectes);
        }
        // Both empty -> nothing to do

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

  const handleLoginMergeConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingLoginMerge) return;
    const { email: userEmail, cloud, local } = pendingLoginMerge;

    let finalBarbarismes: string[];
    let finalDialectes: string[];

    if (mode === 'merge') {
      finalBarbarismes = Array.from(new Set([...cloud.barbarismes, ...local.barbarismes]));
      finalDialectes = Array.from(new Set([...cloud.dialectes, ...local.dialectes]));
    } else {
      // Replace = use cloud data, discard local
      finalBarbarismes = cloud.barbarismes;
      finalDialectes = cloud.dialectes;
    }

    localStorage.setItem('fets_current_email', userEmail);
    localStorage.setItem('doneBarbarismes', JSON.stringify(finalBarbarismes));
    localStorage.setItem('doneDialectes', JSON.stringify(finalDialectes));
    
    // Save merged to cloud
    await cloudSync.saveProgress(userEmail, finalBarbarismes, finalDialectes);
    
    setCurrentUser(userEmail);
    setPendingLoginMerge(null);
    setEmail('');
    onProgressUpdate(finalBarbarismes, finalDialectes);
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  const handleLogout = () => {
    // Clear local progress on logout
    localStorage.removeItem('fets_current_email');
    localStorage.removeItem('doneBarbarismes');
    localStorage.removeItem('doneDialectes');
    setCurrentUser(null);
    setEmail('');
    setShowUserMenu(false);
    setSyncStatus('idle');
    // Update UI to show empty progress
    onProgressUpdate([], []);
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-md border-b border-gray-200/60">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-red-600">Català CSI</h1>

          <div className="flex items-center gap-3">
            {/* --- NOT LOGGED IN: Import/Export + Login button --- */}
            {!currentUser && (
              <>
                {/* Local import/export when not logged in */}
                <button
                  onClick={handleExport}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Exportar (.csi)"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleImportClick}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Importar (.csi)"
                >
                  <Upload size={18} />
                </button>

                <div ref={loginRef} className="relative">
                <button
                  onClick={() => setShowLoginForm(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
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
              </>
            )}

            {/* --- LOGGED IN: status + user button --- */}
            {currentUser && (
              <>
                {/* Sync indicator only */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {syncStatus === 'syncing' && <RefreshCw size={13} className="animate-spin text-blue-500" />}
                  {syncStatus === 'success' && <CheckCircle size={13} className="text-green-500" />}
                  {syncStatus === 'error' && <AlertCircle size={13} className="text-red-500" />}
                  {pendingChanges > 0 && (
                    <span className="bg-yellow-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{pendingChanges}</span>
                  )}
                </div>

                {/* User menu button */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    {isOnline ? <Cloud size={15} className="text-white" /> : <CloudOff size={15} className="text-white" />}
                    <span className="font-medium">{displayName}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
                      <p className="text-sm font-semibold text-gray-800 mb-3">{currentUser}</p>
                      <div className="space-y-1">
                        <button
                          onClick={() => { handleSync(); setShowUserMenu(false); }}
                          disabled={isSyncing || !isOnline}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-500' : 'text-gray-400'} />
                          Sincronitzar ara
                        </button>
                        <button
                          onClick={handleExport}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Download size={14} className="text-gray-400" />
                          Exportar (.csi)
                        </button>
                        <button
                          onClick={handleImportClick}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Upload size={14} className="text-gray-400" />
                          Importar (.csi)
                        </button>
                        <div className="my-2 border-t border-gray-100" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut size={14} className="text-red-400" />
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

      {/* Login merge/replace dialog */}
      {pendingLoginMerge && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Progres existent</h3>
            <p className="text-sm text-gray-500 mb-4">
              Tens progres local ({pendingLoginMerge.local.barbarismes.length} barbarismes) i al nuvol ({pendingLoginMerge.cloud.barbarismes.length} barbarismes). Que vols fer?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleLoginMergeConfirm('merge')}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                Fusionar (conserva tot)
              </button>
              <button
                onClick={() => handleLoginMergeConfirm('replace')}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                Usar nuvol (perd local)
              </button>
              <button
                onClick={() => setPendingLoginMerge(null)}
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
