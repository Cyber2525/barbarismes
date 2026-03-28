import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Download, Upload } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';
import { downloadCSI, readCSIFile, mergeCSIData, CSIData } from '../lib/csiExport';
import { dispatchProgressUpdate } from '../utils/doneItems';

interface HeaderProps {
  onProgressUpdate: (barbarismes: string[], dialectes: string[]) => void;
}

// Cloud progress for merge/replace dialog
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

  // Login merge/replace dialog state
  const [pendingLoginEmail, setPendingLoginEmail] = useState<string | null>(null);
  const [pendingCloudProgress, setPendingCloudProgress] = useState<CloudProgress | null>(null);

  // Delete account confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        // Get cloud progress
        const cloudProgress = await cloudSync.loadProgress(email);
        
        // Get current local progress
        const localBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
        const localDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
        const hasLocalProgress = localBarbarismes.length > 0 || localDialectes.length > 0;
        const hasCloudProgress = cloudProgress && (cloudProgress.barbarismes.length > 0 || cloudProgress.dialectes.length > 0);
        
        // If both have data, show merge/replace dialog
        if (hasLocalProgress && hasCloudProgress) {
          setPendingLoginEmail(email);
          setPendingCloudProgress(cloudProgress);
          setShowLoginForm(false);
          setEmail('');
          setIsSyncing(false);
          setSyncStatus('idle');
          return;
        }
        
        // If only cloud has data, use cloud
        if (hasCloudProgress && cloudProgress) {
          localStorage.setItem('fets_current_email', email);
          setCurrentUser(email);
          localStorage.setItem('doneBarbarismes', JSON.stringify(cloudProgress.barbarismes));
          localStorage.setItem('doneDialectes', JSON.stringify(cloudProgress.dialectes));
          onProgressUpdate(cloudProgress.barbarismes, cloudProgress.dialectes);
          dispatchProgressUpdate();
        } else {
          // If only local has data or neither has data, save local to cloud
          localStorage.setItem('fets_current_email', email);
          setCurrentUser(email);
          if (hasLocalProgress) {
            await cloudSync.saveProgress(email, localBarbarismes, localDialectes);
          }
          onProgressUpdate(localBarbarismes, localDialectes);
          dispatchProgressUpdate();
        }
        
        setShowLoginForm(false);
        setEmail('');
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

  // Handle login merge/replace confirmation
  const handleLoginConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingLoginEmail || !pendingCloudProgress) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      const localBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const localDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
      
      let finalBarbarismes: string[];
      let finalDialectes: string[];
      
      if (mode === 'merge') {
        // Union of both
        finalBarbarismes = Array.from(new Set([...localBarbarismes, ...pendingCloudProgress.barbarismes]));
        finalDialectes = Array.from(new Set([...localDialectes, ...pendingCloudProgress.dialectes]));
      } else {
        // Replace with cloud data
        finalBarbarismes = pendingCloudProgress.barbarismes;
        finalDialectes = pendingCloudProgress.dialectes;
      }
      
      // Save to localStorage
      localStorage.setItem('fets_current_email', pendingLoginEmail);
      localStorage.setItem('doneBarbarismes', JSON.stringify(finalBarbarismes));
      localStorage.setItem('doneDialectes', JSON.stringify(finalDialectes));
      
      // Save merged/final to cloud
      await cloudSync.saveProgress(pendingLoginEmail, finalBarbarismes, finalDialectes);
      
      setCurrentUser(pendingLoginEmail);
      onProgressUpdate(finalBarbarismes, finalDialectes);
      dispatchProgressUpdate();
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    } finally {
      setPendingLoginEmail(null);
      setPendingCloudProgress(null);
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleLogout = () => {
    // Clear user session
    localStorage.removeItem('fets_current_email');
    
    // Clear FETS progress from localStorage on logout
    localStorage.removeItem('doneBarbarismes');
    localStorage.removeItem('doneDialectes');
    
    setCurrentUser(null);
    setEmail('');
    setShowUserMenu(false);
    setSyncStatus('idle');
    
    // Notify App to refresh the UI with empty progress
    onProgressUpdate([], []);
    dispatchProgressUpdate();
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
        dispatchProgressUpdate();
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
    dispatchProgressUpdate();
    setPendingImport(null);
  };

  const displayName = currentUser ? currentUser.split('.')[0].toUpperCase() : null;

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      // Delete account from Supabase
      await cloudSync.deleteAccount(currentUser);
      
      // Clear all local data
      localStorage.removeItem('fets_current_email');
      localStorage.removeItem('doneBarbarismes');
      localStorage.removeItem('doneDialectes');
      
      setCurrentUser(null);
      setShowUserMenu(false);
      setShowDeleteConfirm(false);
      setSyncStatus('success');
      onProgressUpdate([], []);
      dispatchProgressUpdate();
    } catch (error) {
      console.error('Error deleting account:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-md border-b border-gray-200/60">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-red-600">Català CSI</h1>

          <div className="flex items-center gap-3">
            {/* --- NOT LOGGED IN: Import/Export + Login button --- */}
            {!currentUser && (
              <>
                {/* Guest import/export buttons */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 px-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  title="Exportar (.csi)"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-1 px-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                  title="Importar (.csi)"
                >
                  <Upload size={16} />
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
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
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
                          onClick={() => { setShowDeleteConfirm(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <AlertCircle size={14} className="text-orange-400" />
                          Eliminar compte
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
      {pendingLoginEmail && pendingCloudProgress && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Progrés existent al compte</h3>
            <p className="text-sm text-gray-500 mb-4">
              El teu compte <strong>{pendingLoginEmail.split('.')[0].toUpperCase()}</strong> ja té progrés guardat ({pendingCloudProgress.barbarismes.length} barbarismes, {pendingCloudProgress.dialectes.length} dialectes). Tens progrés local també. Què vols fer?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleLoginConfirm('merge')}
                disabled={isSyncing}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {isSyncing ? <RefreshCw size={15} className="animate-spin" /> : null}
                Fusionar (conserva tot)
              </button>
              <button
                onClick={() => handleLoginConfirm('replace')}
                disabled={isSyncing}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                Usar només el del núvol
              </button>
              <button
                onClick={() => { setPendingLoginEmail(null); setPendingCloudProgress(null); }}
                disabled={isSyncing}
                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm transition-colors"
              >
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-red-600 mb-2">Eliminar compte i dades</h3>
            <p className="text-sm text-gray-600 mb-4">
              Aquesta acció eliminarà permanentment el teu compte <strong>{currentUser}</strong> i tots els dats de progres de Supabase. No es pot desfer.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isSyncing}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {isSyncing ? <RefreshCw size={15} className="animate-spin" /> : <AlertCircle size={15} />}
                Eliminar permanentment
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSyncing}
                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm transition-colors"
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
