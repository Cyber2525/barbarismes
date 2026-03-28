import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  LogOut, 
  User, 
  Download, 
  Upload, 
  Check, 
  X,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export function SyncStatus() {
  const { user, logout } = useAuth();
  const { 
    isOnline, 
    isSyncing, 
    lastSyncTime, 
    pendingChanges, 
    syncNow, 
    exportData, 
    importData,
    doneBarbarismes,
    doneDialectes
  } = useSync();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    const name = user?.email.split('@')[0] || 'GUEST';
    const data = exportData(name);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EC-CSI-${name}.csi`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setShowMenu(false);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await importData(content, importMode);
      
      if (result.success) {
        setImportSuccess(true);
        setTimeout(() => {
          setShowImportModal(false);
          setImportSuccess(false);
        }, 1500);
      } else {
        setImportError(result.error || 'Error important les dades');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Mai';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Ara mateix';
    if (diff < 3600000) return `Fa ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Fa ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString('ca');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isOnline 
            ? pendingChanges > 0 
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isSyncing ? (
          <RefreshCw size={18} className="animate-spin" />
        ) : isOnline ? (
          <Cloud size={18} />
        ) : (
          <CloudOff size={18} />
        )}
        <span className="text-sm font-medium hidden sm:inline">
          {isSyncing ? 'Sincronitzant...' : isOnline ? 'Connectat' : 'Offline'}
        </span>
        {pendingChanges > 0 && !isSyncing && (
          <span className="flex items-center justify-center w-5 h-5 bg-yellow-500 text-white text-xs rounded-full">
            {pendingChanges}
          </span>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <User size={20} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{user.email}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {isOnline ? (
                    <>
                      <Wifi size={12} className="text-green-500" />
                      <span>Connectat</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} className="text-red-500" />
                      <span>Sense connexio</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100 text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Barbarismes fets:</span>
              <span className="font-medium">{doneBarbarismes.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Dialectes fets:</span>
              <span className="font-medium">{doneDialectes.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Ultima sincronitzacio:</span>
              <span className="font-medium">{formatLastSync(lastSyncTime)}</span>
            </div>
            {pendingChanges > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Canvis pendents:</span>
                <span className="font-medium">{pendingChanges}</span>
              </div>
            )}
          </div>

          <div className="p-2">
            <button
              onClick={() => { syncNow(); setShowMenu(false); }}
              disabled={!isOnline || isSyncing}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              <span>Sincronitzar ara</span>
            </button>
            
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              <span>Exportar dades (.csi)</span>
            </button>
            
            <button
              onClick={handleImportClick}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload size={18} />
              <span>Importar dades</span>
            </button>

            <hr className="my-2 border-gray-100" />

            <button
              onClick={() => { logout(); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Tancar sessio</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Importar dades</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {importSuccess ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <p className="font-medium text-green-700">Dades importades correctament!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode d&apos;importacio
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportMode('merge')}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                          importMode === 'merge'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Fusionar</div>
                        <div className="text-xs text-gray-500">Afegeix al progres actual</div>
                      </button>
                      <button
                        onClick={() => setImportMode('replace')}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                          importMode === 'replace'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Substituir</div>
                        <div className="text-xs text-gray-500">Reemplaca tot el progres</div>
                      </button>
                    </div>
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle size={18} />
                      <span>{importError}</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csi"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    <span>Seleccionar fitxer .csi</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
