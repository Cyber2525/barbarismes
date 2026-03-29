import { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, Download, Upload, LogOut, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cloudSync } from '../lib/cloudSync';
import { downloadCSI, readCSIFile, mergeCSIData, CSIData } from '../lib/csiExport';
import { dispatchProgressUpdate } from '../utils/doneItems';

interface CloudSyncPanelProps {
  onProgressUpdate: (barbarismes: string[], dialectes: string[]) => void;
}

export function CloudSyncPanel({ onProgressUpdate }: CloudSyncPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem('fets_current_email')
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [pendingImport, setPendingImport] = useState<CSIData | null>(null);
  const [isExitingImport, setIsExitingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeImportDialog = () => {
    setIsExitingImport(true);
    setTimeout(() => { setIsExitingImport(false); setPendingImport(null); }, 200);
  };

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

  // Keep currentUser in sync with Header changes (e.g. login/logout from Header)
  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(localStorage.getItem('fets_current_email'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-sync on page init if user is logged in and online
  useEffect(() => {
    if (currentUser && isOnline && syncStatus === 'idle') {
      handleSync();
    }
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && currentUser && syncStatus === 'idle') {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (!currentUser || !isOnline) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const result = await cloudSync.sync(currentUser);
      onProgressUpdate(result.barbarismes, result.dialectes);
      dispatchProgressUpdate();
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fets_current_email');
    localStorage.removeItem('doneBarbarismes');
    localStorage.removeItem('doneDialectes');
    setCurrentUser(null);
    setSyncStatus('idle');
    onProgressUpdate([], []);
    dispatchProgressUpdate();
  };

  const handleExport = () => {
    const barbarismes = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    downloadCSI(currentUser, barbarismes, dialectes);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readCSIFile(file);
    if (data) {
      const existingB: string[] = JSON.parse(localStorage.getItem('doneBarbarismes') || '[]');
      const existingD: string[] = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
      const hasExisting = existingB.length > 0 || existingD.length > 0;
      if (!hasExisting) {
        await applyImport('replace', data);
      } else {
        setPendingImport(data);
      }
    } else {
      alert('Error llegint el fitxer CSI');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyImport = async (mode: 'merge' | 'replace', data: CSIData) => {
    const existing = {
      barbarismes: JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'),
      dialectes: JSON.parse(localStorage.getItem('doneDialectes') || '[]'),
    };
    const newData = mode === 'merge' ? mergeCSIData(existing, data) : { barbarismes: data.barbarismes, dialectes: data.dialectes };
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

  if (!currentUser) return null; // Panel only visible when logged in — guest import/export is in Header

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all text-white ${
          isOnline ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
        }`}
      >
        {isOnline ? <Cloud size={24} /> : <CloudOff size={24} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Cloud Sync</h3>
              <div className="flex items-center gap-1.5">
                {isOnline ? <Wifi size={14} className="text-green-300" /> : <WifiOff size={14} className="text-yellow-300" />}
                <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <p className="text-xs text-red-100 mt-1">{displayName}</p>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Estat:</span>
              <span className="flex items-center gap-1">
                {syncStatus === 'syncing' && <><RefreshCw size={13} className="animate-spin text-blue-500 transition-opacity duration-300 opacity-100" /><span className="text-blue-500 transition-opacity duration-300 opacity-100">Sincronitzant...</span></>}
                {syncStatus === 'success' && <><CheckCircle size={13} className="text-green-500 transition-opacity duration-300 opacity-100" /><span className="text-green-500 transition-opacity duration-300 opacity-100">Sincronitzat</span></>}
                {syncStatus === 'error' && <><AlertCircle size={13} className="text-red-500 transition-opacity duration-300 opacity-100" /><span className="text-red-500 transition-opacity duration-300 opacity-100">Error</span></>}
                {syncStatus === 'idle' && <span className="text-gray-400 transition-opacity duration-300 opacity-100">—</span>}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                Sync
              </button>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download size={14} />
                Exportar
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                <Upload size={14} />
                Importar
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                <LogOut size={14} />
                Sortir
              </button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept=".csi" onChange={handleFileSelect} className="hidden" />
        </div>
      )}

      {pendingImport && (
        <div className={`modal-container bg-black/50 ${isExitingImport ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 ${isExitingImport ? 'exiting' : ''}`}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Importar fitxer CSI</h3>
            <p className="text-sm text-gray-500 mb-4">
              De: <strong>{pendingImport.userName}</strong> &mdash; {pendingImport.barbarismes.length} barbarismes, {pendingImport.dialectes.length} dialectes
            </p>
            <div className="space-y-2">
              <button onClick={() => applyImport('merge', pendingImport)} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 text-sm">Fusionar (conserva tot)</button>
              <button onClick={() => applyImport('replace', pendingImport)} className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 text-sm">Substituir (sobreescriu)</button>
              <button onClick={closeImportDialog} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 text-sm">Cancel·lar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
