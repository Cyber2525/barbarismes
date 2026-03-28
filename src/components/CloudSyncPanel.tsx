import { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, Download, Upload, LogIn, LogOut, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';
import { downloadCSI, readCSIFile, mergeCSIData, CSIData } from '../lib/csiExport';

interface CloudSyncPanelProps {
  onProgressUpdate: (barbarismes: string[], dialectes: string[]) => void;
}

export function CloudSyncPanel({ onProgressUpdate }: CloudSyncPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(() => 
    localStorage.getItem('fets_current_email')
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [emailError, setEmailError] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace' | null>(null);
  const [pendingImport, setPendingImport] = useState<CSIData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track online status
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

  // Update pending changes count
  useEffect(() => {
    if (currentUser) {
      setPendingChanges(cloudSync.getPendingChangesCount(currentUser));
    }
  }, [currentUser, syncStatus]);

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
    setSyncStatus('idle');
  };

  const handleSync = async () => {
    if (!currentUser || !isOnline) return;

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      // Get local data
      const localBarbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const localDialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');

      // Save to cloud
      await cloudSync.saveProgress(currentUser, localBarbarismes, localDialectes);

      // Process any queued changes
      await cloudSync.processQueue(currentUser);

      // Reload from cloud to get merged data
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await readCSIFile(file);
    if (data) {
      setPendingImport(data);
      setImportMode(null); // Show dialog
    } else {
      alert('Error reading CSI file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;

    const existing = {
      barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
      dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
    };

    let newData: { barbarismes: string[]; dialectes: string[] };

    if (mode === 'merge') {
      newData = mergeCSIData(existing, pendingImport);
    } else {
      newData = {
        barbarismes: pendingImport.barbarismes,
        dialectes: pendingImport.dialectes,
      };
    }

    // Save locally
    localStorage.setItem('doneBarbarismes', JSON.stringify(newData.barbarismes));
    localStorage.setItem('doneDialectes', JSON.stringify(newData.dialectes));

    // Sync to cloud if logged in
    if (currentUser && isOnline) {
      await cloudSync.saveProgress(currentUser, newData.barbarismes, newData.dialectes);
    }

    onProgressUpdate(newData.barbarismes, newData.dialectes);
    setPendingImport(null);
    setImportMode(null);
  };

  const displayName = currentUser ? currentUser.split('.')[0].toUpperCase() : null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all ${
          currentUser 
            ? isOnline 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-red-500 hover:bg-red-600'
        } text-white`}
      >
        {currentUser ? (
          isOnline ? <Cloud size={24} /> : <CloudOff size={24} />
        ) : (
          <LogIn size={24} />
        )}
        {pendingChanges > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {pendingChanges}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cloud Sync</h3>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi size={16} className="text-green-300" />
                ) : (
                  <WifiOff size={16} className="text-yellow-300" />
                )}
                <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            {currentUser && (
              <p className="text-sm text-red-100 mt-1">Logged in as {displayName}</p>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {!currentUser ? (
              /* Login form */
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
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <LogIn size={18} />
                  )}
                  Login / Create Account
                </button>
              </div>
            ) : (
              /* Logged in view */
              <div className="space-y-3">
                {/* Sync status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="flex items-center gap-1">
                    {syncStatus === 'syncing' && (
                      <>
                        <RefreshCw size={14} className="animate-spin text-blue-500" />
                        <span className="text-blue-500">Syncing...</span>
                      </>
                    )}
                    {syncStatus === 'success' && (
                      <>
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-green-500">Synced</span>
                      </>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <AlertCircle size={14} className="text-red-500" />
                        <span className="text-red-500">Error</span>
                      </>
                    )}
                    {syncStatus === 'idle' && (
                      <span className="text-gray-500">Ready</span>
                    )}
                  </span>
                </div>

                {pendingChanges > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-700">
                    {pendingChanges} pending change(s) to sync
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    Sync
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    <Download size={16} />
                    Export
                  </button>
                  <button
                    onClick={handleImportClick}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
                  >
                    <Upload size={16} />
                    Import
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csi"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Import dialog */}
      {pendingImport && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Import CSI File</h3>
            <p className="text-sm text-gray-600 mb-4">
              Importing data from <strong>{pendingImport.userName}</strong>
              <br />
              {pendingImport.barbarismes.length} barbarismes, {pendingImport.dialectes.length} dialectes
            </p>
            <p className="text-sm text-gray-600 mb-4">
              How would you like to import this data?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleImportConfirm('merge')}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
              >
                Merge (Keep both)
              </button>
              <button
                onClick={() => handleImportConfirm('replace')}
                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
              >
                Replace (Overwrite)
              </button>
              <button
                onClick={() => {
                  setPendingImport(null);
                  setImportMode(null);
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
