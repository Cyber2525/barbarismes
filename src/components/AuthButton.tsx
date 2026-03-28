import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadCSI, importCSI, CSIData } from '../lib/csiFormat';
import { getDoneItems, saveDoneItems } from '../utils/doneItems';
import { syncToCloud } from '../lib/sync';
import { User, LogOut, Cloud, CloudOff, Download, Upload, RefreshCw, Mail, AlertCircle } from 'lucide-react';

export function AuthButton() {
  const { user, loading, isOnline, signInWithEmail, signOut, syncNow } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [importData, setImportData] = useState<CSIData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    if (!email.includes('@')) { setAuthError('Correu no valid'); return; }
    setLoggingIn(true);
    setAuthError('');
    await signInWithEmail(email);
    setLoggingIn(false);
    setShowMenu(false);
    setShowEmailInput(false);
    setEmail('');
  };

  const resetAuth = () => {
    setShowEmailInput(false);
    setEmail('');
    setAuthError('');
  };

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
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-red-100 z-50 p-4">
            {showEmailInput ? (
              <div>
                <p className="text-sm font-medium text-gray-800 mb-3">Iniciar sessio</p>
                <label className="text-xs text-gray-600 mb-1 block">Correu electronic</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="el-teu@correu.cat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:border-red-500 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                />
                {authError && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle size={12} />{authError}</p>}
                <button
                  onClick={handleLogin}
                  disabled={loggingIn}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-60"
                >
                  {loggingIn ? 'Iniciant...' : 'Iniciar sessio'}
                </button>
                <button onClick={resetAuth} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">Enrere</button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowEmailInput(true)}
                  className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 rounded-lg border border-red-200 mb-2"
                >
                  <Mail size={18} className="text-red-600" />
                  <span className="text-sm text-gray-700">Iniciar amb correu</span>
                </button>
                <hr className="border-red-100 my-2" />
                <button onClick={handleImportClick} className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 rounded text-sm">
                  <Upload size={16} className="text-red-600" />
                  <span className="text-gray-700">Importar .csi</span>
                </button>
                <button onClick={handleExport} className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 rounded text-sm">
                  <Download size={16} className="text-red-600" />
                  <span className="text-gray-700">Exportar .csi</span>
                </button>
              </>
            )}
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
