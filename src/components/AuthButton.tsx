import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadCSI, importCSI, CSIData } from '../lib/csiFormat';
import { getDoneItems, saveDoneItems } from '../utils/doneItems';
import { syncToCloud } from '../lib/sync';
import { User, LogOut, Cloud, CloudOff, Download, Upload, RefreshCw } from 'lucide-react';

export function AuthButton() {
  const { user, loading, isOnline, signInWithGoogle, signInWithApple, signOut, syncNow } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<CSIData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loading) return null;

  const handleExport = () => {
    const barbarismes = Array.from(getDoneItems());
    const dialectes = JSON.parse(localStorage.getItem('doneDialectes') || '[]');
    const name = user?.email?.split('@')[0] || 'GUEST';
    downloadCSI(barbarismes, dialectes, name);
    setShowMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await importCSI(file);
    if (data) {
      setImportData(data);
      setShowImportModal(true);
    }
    e.target.value = '';
  };

  const handleImport = async (mode: 'merge' | 'replace') => {
    if (!importData) return;
    
    if (mode === 'replace') {
      saveDoneItems(new Set(importData.barbarismes));
      localStorage.setItem('doneDialectes', JSON.stringify(importData.dialectes));
    } else {
      const currentBarbarismes = getDoneItems();
      importData.barbarismes.forEach(b => currentBarbarismes.add(b));
      saveDoneItems(currentBarbarismes);
      
      const currentDialectes = new Set<string>(JSON.parse(localStorage.getItem('doneDialectes') || '[]'));
      importData.dialectes.forEach(d => currentDialectes.add(d));
      localStorage.setItem('doneDialectes', JSON.stringify(Array.from(currentDialectes)));
    }
    
    if (user) {
      await syncToCloud(
        Array.from(getDoneItems()),
        JSON.parse(localStorage.getItem('doneDialectes') || '[]')
      );
    }
    
    setShowImportModal(false);
    setImportData(null);
    window.location.reload();
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncNow();
    setSyncing(false);
    setShowMenu(false);
  };

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-red-200 text-red-700 hover:bg-red-50"
        >
          <User size={18} />
          <span className="text-sm">Iniciar Sessio</span>
        </button>
        
        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-red-100 z-50">
            <button
              onClick={() => { signInWithGoogle(); setShowMenu(false); }}
              className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 rounded-t-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm text-gray-700">Google</span>
            </button>
            <button
              onClick={() => { signInWithApple(); setShowMenu(false); }}
              className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-sm text-gray-700">Apple</span>
            </button>
            <hr className="border-red-100" />
            <button
              onClick={handleImportClick}
              className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3"
            >
              <Upload size={18} className="text-red-600" />
              <span className="text-sm text-gray-700">Importar .csi</span>
            </button>
            <button
              onClick={handleExport}
              className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 rounded-b-lg"
            >
              <Download size={18} className="text-red-600" />
              <span className="text-sm text-gray-700">Exportar .csi</span>
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".csi" onChange={handleFileChange} className="hidden" />
        
        {showImportModal && importData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Importar Progres</h3>
              <p className="text-sm text-gray-600 mb-4">
                Arxiu: {importData.name}<br/>
                Barbarismes: {importData.barbarismes.length}<br/>
                Dialectes: {importData.dialectes.length}
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleImport('merge')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Fusionar</button>
                <button onClick={() => handleImport('replace')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reemplacar</button>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel·lar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-red-200"
      >
        {isOnline ? <Cloud size={18} className="text-green-600" /> : <CloudOff size={18} className="text-orange-500" />}
        <span className="text-sm text-gray-700 max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-red-100 z-50">
          <div className="px-4 py-3 border-b border-red-100">
            <p className="text-xs text-gray-500">Compte</p>
            <p className="text-sm text-gray-700 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !isOnline}
            className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 disabled:opacity-50"
          >
            <RefreshCw size={18} className={`text-red-600 ${syncing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-700">{syncing ? 'Sincronitzant...' : 'Sincronitzar'}</span>
          </button>
          <button onClick={handleExport} className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3">
            <Download size={18} className="text-red-600" />
            <span className="text-sm text-gray-700">Exportar .csi</span>
          </button>
          <button onClick={handleImportClick} className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3">
            <Upload size={18} className="text-red-600" />
            <span className="text-sm text-gray-700">Importar .csi</span>
          </button>
          <hr className="border-red-100" />
          <button onClick={() => { signOut(); setShowMenu(false); }} className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 rounded-b-lg text-red-600">
            <LogOut size={18} />
            <span className="text-sm">Tancar Sessio</span>
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".csi" onChange={handleFileChange} className="hidden" />
      
      {showImportModal && importData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Importar Progres</h3>
            <p className="text-sm text-gray-600 mb-4">
              Arxiu: {importData.name}<br/>
              Barbarismes: {importData.barbarismes.length}<br/>
              Dialectes: {importData.dialectes.length}
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleImport('merge')} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Fusionar</button>
              <button onClick={() => handleImport('replace')} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reemplacar</button>
            </div>
            <button onClick={() => { setShowImportModal(false); setImportData(null); }} className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel·lar</button>
          </div>
        </div>
      )}
    </div>
  );
}
