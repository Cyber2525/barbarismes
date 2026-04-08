import { useState, useEffect, useRef, useCallback } from 'react';
import { IOSToggle } from './IOSToggle';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Download, Upload, Radio } from 'lucide-react';
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
  const [isExitingLoginForm, setIsExitingLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  // User menu state (when logged in)
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isExitingUserMenu, setIsExitingUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Import state
  const [pendingImport, setPendingImport] = useState<CSIData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Login merge/replace dialog state
  const [pendingLoginEmail, setPendingLoginEmail] = useState<string | null>(null);
  const [pendingCloudProgress, setPendingCloudProgress] = useState<CloudProgress | null>(null);
  const [loginAction, setLoginAction] = useState<'merge' | 'replace' | null>(null);

  // Delete account confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [downloadedBackup, setDownloadedBackup] = useState(false);

  // Modal exit animation states
  const [isExitingImport, setIsExitingImport] = useState(false);
  const [isExitingLogin, setIsExitingLogin] = useState(false);
  const [isExitingDelete, setIsExitingDelete] = useState(false);

  const closeImportDialog = () => {
    setIsExitingImport(true);
    setTimeout(() => { setIsExitingImport(false); setPendingImport(null); }, 200);
  };
  const closeLoginDialog = () => {
    setIsExitingLogin(true);
    setTimeout(() => { setIsExitingLogin(false); setPendingLoginEmail(null); setPendingCloudProgress(null); }, 200);
  };
  const closeDeleteDialog = () => {
    setIsExitingDelete(true);
    setTimeout(() => { setIsExitingDelete(false); setShowDeleteConfirm(false); setDeleteConfirmText(''); setDownloadedBackup(false); }, 200);
  };
  const closeLoginForm = () => {
    setIsExitingLoginForm(true);
    setTimeout(() => { setIsExitingLoginForm(false); setShowLoginForm(false); }, 140);
  };
  const closeUserMenu = () => {
    setIsExitingUserMenu(true);
    setTimeout(() => { setIsExitingUserMenu(false); setShowUserMenu(false); }, 140);
  };

  // Live sync state
  const [liveSync, setLiveSync] = useState<boolean>(() => localStorage.getItem('fets_live_sync') === 'true');
  const [liveSyncHovered, setLiveSyncHovered] = useState(false);
  const isSyncingRef = useRef(false);
  const liveSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Pending changes are tracked visually via syncStatus only
      setPendingChanges(0);
    }
  }, [currentUser, syncStatus]);

  // Close login form on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        closeLoginForm();
      }
    };
    if (showLoginForm) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLoginForm]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        closeUserMenu();
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && currentUser) {
      handleSync();
    }
  }, [isOnline]);

  // Auto-sync on page init if user is logged in and online
  useEffect(() => {
    if (currentUser && isOnline) {
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setLoginError(null);

    // Block login if offline — server is the source of truth
    if (!navigator.onLine) {
      setLoginError('Sense connexió. Connecta\'t a internet per iniciar sessió.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const user = await cloudSync.login(email);

      const cloudBarbarismes = user.progress_data;
      const cloudDialectes = user.dialect_progress;
      const cloudTs = user.item_timestamps;

      // Get current local progress
      const localBarbarismes: string[] = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const localDialectes: string[] = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
      const hasLocalProgress = localBarbarismes.length > 0 || localDialectes.length > 0;
      const hasCloudProgress = cloudBarbarismes.length > 0 || cloudDialectes.length > 0;
      
      // Check if there are local fets that are NOT in the cloud
      const localNotInCloud = localBarbarismes.some(b => !cloudBarbarismes.includes(b)) || 
                              localDialectes.some(d => !cloudDialectes.includes(d));

      // If both have data AND there are local fets not in cloud, show merge/replace dialog
      if (localNotInCloud && hasCloudProgress) {
        setPendingLoginEmail(email);
        setPendingCloudProgress({ barbarismes: cloudBarbarismes, dialectes: cloudDialectes });
        closeLoginForm();
        setEmail('');
        setIsSyncing(false);
        setSyncStatus('idle');
        return;
      }

      // Cloud data wins — apply it locally
      const finalBarbarismes = hasCloudProgress ? cloudBarbarismes : localBarbarismes;
      const finalDialectes = hasCloudProgress ? cloudDialectes : localDialectes;

      localStorage.setItem('fets_current_email', email);
      localStorage.setItem('doneBarbarismes', JSON.stringify(finalBarbarismes));
      localStorage.setItem('doneDialectes', JSON.stringify(finalDialectes));
      // Store cloud timestamps locally so LWW works from this point
      localStorage.setItem('fets_item_timestamps', JSON.stringify(cloudTs));

      // If new user with local data, push local to cloud right away
      if (!hasCloudProgress && hasLocalProgress) {
        await cloudSync.sync(email);
      }

      setCurrentUser(email);
      onProgressUpdate(finalBarbarismes, finalDialectes);
      dispatchProgressUpdate();
      closeLoginForm();
      setEmail('');
      setSyncStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NO_CONNECTION') {
        setLoginError('Sense connexió. Connecta\'t a internet per iniciar sessió.');
      } else {
        setLoginError('Error del servidor. Torna-ho a intentar.');
      }
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  // Handle login merge/replace confirmation
  const handleLoginConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingLoginEmail || !pendingCloudProgress) return;
    setLoginAction(mode);
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      let finalBarbarismes: string[];
      let finalDialectes: string[];

      if (mode === 'merge') {
        // Fusionar: combinar datos locales + nube y subir todo
        const localBarbarismes: string[] = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
        const localDialectes: string[] = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
        
        finalBarbarismes = Array.from(new Set([...localBarbarismes, ...pendingCloudProgress.barbarismes]));
        finalDialectes = Array.from(new Set([...localDialectes, ...pendingCloudProgress.dialectes]));
        
        localStorage.setItem('fets_current_email', pendingLoginEmail);
        localStorage.setItem('doneBarbarismes', JSON.stringify(finalBarbarismes));
        localStorage.setItem('doneDialectes', JSON.stringify(finalDialectes));
        
        // Push the merged state to cloud
        await cloudSync.sync(pendingLoginEmail);
      } else {
        // Replace: PRIMERO eliminar datos locales, LUEGO usar solo datos de la nube
        // NO hacer sync porque solo queremos bajar de la nube, no subir
        finalBarbarismes = pendingCloudProgress.barbarismes;
        finalDialectes = pendingCloudProgress.dialectes;
        
        // Limpiar datos locales primero
        localStorage.removeItem('doneBarbarismes');
        localStorage.removeItem('doneDialectes');
        localStorage.removeItem('fets_item_timestamps');
        
        // Aplicar solo datos de la nube
        localStorage.setItem('fets_current_email', pendingLoginEmail);
        localStorage.setItem('doneBarbarismes', JSON.stringify(finalBarbarismes));
        localStorage.setItem('doneDialectes', JSON.stringify(finalDialectes));
        
        // Obtener timestamps de la nube para futuras sincronizaciones
        const user = await cloudSync.login(pendingLoginEmail);
        localStorage.setItem('fets_item_timestamps', JSON.stringify(user.item_timestamps));
        
        // NO hacer sync aquí - solo queremos bajar de la nube, no subir nada
      }

      setCurrentUser(pendingLoginEmail);
      onProgressUpdate(finalBarbarismes, finalDialectes);
      dispatchProgressUpdate();
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    } finally {
      setPendingLoginEmail(null);
      setPendingCloudProgress(null);
      setLoginAction(null);
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

  const handleSync = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const result = await cloudSync.sync(currentUser);
      onProgressUpdate(result.barbarismes, result.dialectes);
      dispatchProgressUpdate();
      setSyncStatus('success');
      setPendingChanges(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ACCOUNT_NOT_FOUND') {
        // Account no longer exists in DB — stop sync, wipe local, logout
        isSyncingRef.current = false;
        setIsSyncing(false);
        setSyncStatus('idle');
        setLiveSync(false);
        localStorage.setItem('fets_live_sync', 'false');
        if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current);
        localStorage.removeItem('fets_current_email');
        localStorage.removeItem('doneBarbarismes');
        localStorage.removeItem('doneDialectes');
        localStorage.removeItem('fets_item_timestamps');
        setCurrentUser(null);
        setShowUserMenu(false);
        onProgressUpdate([], []);
        dispatchProgressUpdate();
        return;
      }
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [currentUser, isOnline, onProgressUpdate]);

  const toggleLiveSync = useCallback(() => {
    setLiveSync(prev => {
      const next = !prev;
      localStorage.setItem('fets_live_sync', String(next));
      return next;
    });
  }, []);

  // Live sync loop — schedules next sync 2s after the previous one finishes
  useEffect(() => {
    if (!liveSync || !currentUser || !isOnline) {
      if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current);
      return;
    }
    const schedule = () => {
      liveSyncTimerRef.current = setTimeout(async () => {
        if (!isSyncingRef.current) {
          await handleSync();
        }
        schedule();
      }, 2000);
    };
    schedule();
    return () => {
      if (liveSyncTimerRef.current) clearTimeout(liveSyncTimerRef.current);
    };
  }, [liveSync, currentUser, isOnline, handleSync]);

  const handleExport = () => {
    const barbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    downloadCSI(currentUser, barbarismes, dialectes);
    closeUserMenu();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    closeUserMenu();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readCSIFile(file);
    if (data) {
      // Check if there's any existing local data
      const existingBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const existingDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
      const hasExistingData = existingBarbarismes.length > 0 || existingDialectes.length > 0;
      
      // If no existing data, import directly without dialog
      if (!hasExistingData) {
        // Import directly
        const newData = { barbarismes: data.barbarismes, dialectes: data.dialectes };
        localStorage.setItem('doneBarbarismes', JSON.stringify(newData.barbarismes));
        localStorage.setItem('doneDialectes', JSON.stringify(newData.dialectes));
        
        if (currentUser && isOnline) {
          await cloudSync.sync(currentUser);
        }
        onProgressUpdate(newData.barbarismes, newData.dialectes);
        dispatchProgressUpdate();
      } else {
        // Otherwise, show merge/replace dialog
        setPendingImport(data);
      }
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
      await cloudSync.sync(currentUser);
    }
    onProgressUpdate(newData.barbarismes, newData.dialectes);
    dispatchProgressUpdate();
    setPendingImport(null);
  };

  const displayName = currentUser ? currentUser.split('.')[0].toUpperCase() : null;

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (deleteConfirmText !== 'ELIMINAR') return;
    
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
      setDeleteConfirmText('');
      setDownloadedBackup(false);
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

  const handleDownloadBackup = async () => {
    try {
      await handleExport();
      setDownloadedBackup(true);
    } catch (error) {
      console.error('Error downloading backup:', error);
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
                  className="flex items-center gap-1 px-2 py-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-sm"
                  title="Exportar (.csi)"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-1 px-2 py-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-sm"
                  title="Importar (.csi)"
                >
                  <Upload size={16} />
                </button>

                <div ref={loginRef} className="relative">
                  <button
                    onClick={() => { if (showLoginForm) { closeLoginForm(); } else { setShowLoginForm(true); } }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <LogIn size={16} />
                    Login
                  </button>

                  {(showLoginForm || isExitingLoginForm) && (
                    <div className={`dropdown-panel absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50${isExitingLoginForm ? ' exiting' : ''}`}>
                      <p className="text-sm font-semibold text-gray-800 mb-3">Iniciar sessió</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Email CSI</label>
                          <input
                            type="text"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value.toLowerCase());
                              setLoginError(null);
                              if (emailError) validateEmail(e.target.value.toLowerCase());
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && email && !isSyncing) handleLogin(); }}
                            placeholder="12345678.santignasi@fje.edu"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${emailError || loginError ? 'border-red-500' : 'border-gray-300'}`}
                            autoFocus
                          />
                          {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                          {loginError && <p className="text-xs text-red-500 mt-1">{loginError}</p>}
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
                {/* Sync indicator: pulsing red dot when live ON, or sync/check/error icons when live OFF */}
                <div className="relative flex items-center justify-center" style={{ width: 18, height: 18 }}>
                  {/* Red pulsing dot — always visible when live sync is ON */}
                  <span
                    className="transition-opacity duration-300 absolute inset-0 flex items-center justify-center"
                    style={{ opacity: liveSync ? 1 : 0, pointerEvents: 'none' }}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  </span>
                  {/* Syncing spinner — only when live is OFF */}
                  <span
                    className="transition-opacity duration-300 absolute inset-0 flex items-center justify-center"
                    style={{ opacity: !liveSync && syncStatus === 'syncing' ? 1 : 0, pointerEvents: 'none' }}
                  >
                    <RefreshCw size={13} className="animate-spin text-blue-500" />
                  </span>
                  {/* Success checkmark — only when live is OFF */}
                  <span
                    className="transition-opacity duration-300 absolute inset-0 flex items-center justify-center"
                    style={{ opacity: !liveSync && syncStatus === 'success' ? 1 : 0, pointerEvents: 'none' }}
                  >
                    <CheckCircle size={13} className="text-green-500" />
                  </span>
                  {/* Error icon — only when live is OFF */}
                  <span
                    className="transition-opacity duration-300 absolute inset-0 flex items-center justify-center"
                    style={{ opacity: !liveSync && syncStatus === 'error' ? 1 : 0, pointerEvents: 'none' }}
                  >
                    <AlertCircle size={13} className="text-red-500" />
                  </span>
                </div>

                {/* User menu button */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => { if (showUserMenu) { closeUserMenu(); } else { setShowUserMenu(true); } }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    {isOnline ? <Cloud size={15} className="text-white" /> : <CloudOff size={15} className="text-white" />}
                    <span className="font-medium">{displayName}</span>
                  </button>

                  {(showUserMenu || isExitingUserMenu) && (
                    <div className={`dropdown-panel absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50${isExitingUserMenu ? ' exiting' : ''}`}>
                      <p className="text-sm font-semibold text-gray-800 mb-3">{currentUser}</p>
                      <div className="space-y-1">
                        {/* Live sync row — left zone: sync now / right zone: toggle */}
                        <div className="w-full flex items-center rounded-lg transition-colors overflow-hidden hover:bg-gray-100">
                          {/* LEFT zone: hover changes text, click = sync now */}
                          <div
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 flex-1 cursor-pointer"
                            onMouseEnter={() => setLiveSyncHovered(true)}
                            onMouseLeave={() => setLiveSyncHovered(false)}
                            onClick={() => { handleSync(); closeUserMenu(); }}
                          >
                            {liveSync ? (
                              <Radio size={14} className="text-red-500" />
                            ) : (
                              <RefreshCw size={14} className="text-gray-400" />
                            )}
                            <span>
                              {liveSyncHovered ? 'Sincronitzar ara' : 'Sinc. en directe'}
                            </span>
                          </div>
                          {/* RIGHT zone: toggle only, no hover text change */}
                          <div
                            className="px-2 py-0 flex items-center justify-center cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); }}
                          >
                            <IOSToggle
                              checked={liveSync}
                              onChange={toggleLiveSync}
                              scale={0.75}
                            />
                          </div>
                        </div>
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
                          onClick={() => { setShowDeleteConfirm(true); closeUserMenu(); }}
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
        <div className={`modal-container bg-black/50 ${isExitingImport ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 ${isExitingImport ? 'exiting' : ''}`}>
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
                onClick={closeImportDialog}
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
        <div className={`modal-container bg-black/50 ${isExitingLogin ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 ${isExitingLogin ? 'exiting' : ''}`}>
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
                {isSyncing && loginAction === 'merge' ? <RefreshCw size={15} className="animate-spin" /> : null}
                Fusionar (conserva tot)
              </button>
              <button
                onClick={() => handleLoginConfirm('replace')}
                disabled={isSyncing}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {isSyncing && loginAction === 'replace' ? <RefreshCw size={15} className="animate-spin" /> : null}
                Usar només el del núvol
              </button>
              <button
                onClick={closeLoginDialog}
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
        <div className={`modal-container bg-black/50 ${isExitingDelete ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 ${isExitingDelete ? 'exiting' : ''}`}>
            <h3 className="text-base font-semibold text-red-600 mb-2">Eliminar compte i dades</h3>
            <p className="text-sm text-gray-600 mb-4">
              Aquesta acció eliminarà permanentment el teu compte <strong>{currentUser}</strong> i totes les seves dades. Això és irreversible.
            </p>
            
            <div className="space-y-3">
              {/* Download backup button */}
              <button
                onClick={handleDownloadBackup}
                disabled={downloadedBackup}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {downloadedBackup ? (
                  <>
                    <CheckCircle size={15} />
                    Còpia descarregada
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Baixar còpia de seguretat
                  </>
                )}
              </button>

              {/* Confirmation text field */}
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="Escriu &quot;ELIMINAR&quot; per continuar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />

              {/* Delete button - only enabled if text matches */}
              <button
                onClick={handleDeleteAccount}
                disabled={isSyncing || deleteConfirmText !== 'ELIMINAR'}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {isSyncing ? <RefreshCw size={15} className="animate-spin" /> : <AlertCircle size={15} />}
                Eliminar permanentment
              </button>

              {/* Cancel button */}
              <button
                onClick={closeDeleteDialog}
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
