import { useAuth } from '../context/AuthContext';
import { LogOut, Cloud, CloudOff, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { getDoneItems } from '../utils/doneItems';
import { exportToCSI, importFromCSI, mergeCSIData, replaceCSIData, downloadCSIFile, generateCSIFilename } from '../lib/csiFormat';

export function AuthButton() {
  const { user, isLoading, isOnline, loginWithGoogle, loginWithApple, logout, syncProgress } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    try {
      await syncProgress();
    } catch (error) {
      console.error('[UI] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    try {
      const doneItems = Array.from(getDoneItems());
      // For now, we'll export empty dialectItems (can be extended later)
      const content = exportToCSI(doneItems, [], user?.name || 'EXPORT', 'NAME');
      const fileName = generateCSIFilename(user?.name || 'EXPORT', 'NAME');
      downloadCSIFile(content, fileName);
    } catch (error) {
      console.error('[UI] Export error:', error);
      alert('Error exporting data');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csi,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const importedData = importFromCSI(content);
        
        if (!importedData) {
          alert('Invalid CSI file format');
          return;
        }

        const currentDone = Array.from(getDoneItems());
        let merged;

        if (importMode === 'merge') {
          merged = mergeCSIData(
            { doneItems: currentDone, doneDialectItems: [] },
            importedData
          );
        } else {
          merged = replaceCSIData(importedData);
        }

        // Update localStorage with merged data
        localStorage.setItem('doneBarbarismes', JSON.stringify(merged.doneItems));
        
        // Trigger reload to show updated data
        window.location.reload();
      } catch (error) {
        console.error('[UI] Import error:', error);
        alert('Error importing data');
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={loginWithGoogle}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        <button
          onClick={loginWithApple}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 13.5c-.91 2.92.37 5.65 2.85 6.75.56.27 1.07.04 1.23-.56.44-1.44.57-3.89-1.88-5.7-.58-.4-1.5-.37-2.2-.49zm-11.1 0c-.7.12-1.62.09-2.2.49-2.45 1.81-2.32 4.26-1.88 5.7.16.6.67.83 1.23.56 2.48-1.1 3.76-3.83 2.85-6.75zm11.1-2.5c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-11 0c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/>
          </svg>
          Apple
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 items-start">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-700">{user.email}</span>
        </div>

        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isOnline
              ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
          {isSyncing ? 'Syncing...' : isOnline ? 'Sync' : 'Offline'}
        </button>

        <button
          onClick={() => setShowExportImport(!showExportImport)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          <Download size={16} />
          Export/Import
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {showExportImport && (
        <div className="w-full max-w-xs bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-purple-900">Export / Import</h3>
          
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-900">Import Mode:</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-purple-700">Merge</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-purple-700">Replace</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
