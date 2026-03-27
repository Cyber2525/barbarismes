import { useEffect, useMemo, useState } from 'react';
import {
  addOrUpdateFet,
  deleteFet,
  exportFetsDocument,
  getFets,
  getLastSyncAt,
  getPendingCount,
  getSession,
  importFetsDocument,
  loginWithPasskey,
  loginWithPassword,
  loginWithProvider,
  logout,
  syncPendingChanges,
  type AuthSession,
  type FetRecord
} from '../utils/fetsSync';

export function DataSyncPanel() {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fets, setFets] = useState<FetRecord[]>(() => getFets());
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());
  const [lastSyncAt, setLastSyncAt] = useState(() => getLastSyncAt());
  const [nameInput, setNameInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('GUEST.csi');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const refreshState = () => {
    setSession(getSession());
    setFets(getFets());
    setPendingCount(getPendingCount());
    setLastSyncAt(getLastSyncAt());
  };

  useEffect(() => {
    const handleOnline = async () => {
      await runSync('Connexió recuperada, sincronitzant...');
    };

    window.addEventListener('online', handleOnline);
    const timer = window.setInterval(() => {
      refreshState();
    }, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.clearInterval(timer);
    };
  }, []);

  const runSync = async (message = 'Sincronitzant...') => {
    setSyncing(true);
    setStatus(message);
    const result = await syncPendingChanges();
    refreshState();
    if (result.synced === 0) {
      setStatus(navigator.onLine ? 'No hi ha canvis pendents.' : 'Sense connexió: els canvis queden en cua.');
    } else {
      setStatus(`Sincronitzats ${result.synced} canvis${result.conflicts ? ` (${result.conflicts} conflictes evitats)` : ''}.`);
    }
    setSyncing(false);
  };

  const addFet = () => {
    if (!nameInput.trim() || !ownerInput.trim()) {
      setStatus('Has d\'omplir nom i owner.');
      return;
    }
    addOrUpdateFet({ id: '', name: nameInput.trim(), owner: ownerInput.trim() });
    setNameInput('');
    refreshState();
    setStatus('Fet afegit localment.');
  };

  const exportDocument = () => {
    const payload = exportFetsDocument();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fets-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Document exportat correctament.');
  };

  const handleImport = async (file?: File | null) => {
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const amount = importFetsDocument(parsed, importMode);
      refreshState();
      setStatus(`Importació completada (${amount} registres) amb mode ${importMode}.`);
    } catch {
      setStatus('Error d\'importació: fitxer invàlid.');
    }
  };

  const sessionLabel = useMemo(() => {
    if (!session) return 'No autenticat';
    return `${session.email} · ${session.provider}`;
  }, [session]);

  return (
    <section className="w-full max-w-4xl bg-white rounded-xl shadow-md p-4 md:p-6 mt-6">
      <h2 className="text-xl font-semibold text-red-700 mb-2">Compte i Sync de FETS</h2>
      <p className="text-sm text-slate-600 mb-4">Login amb usuari/contrasenya, Google, Apple i passkey + sincronització offline amb cua pendent.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 border rounded-lg bg-red-50/40">
          <p className="text-sm mb-2 font-medium">Sessió: {sessionLabel}</p>
          <div className="flex flex-col gap-2">
            <input className="px-3 py-2 border rounded" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="px-3 py-2 border rounded" placeholder="contrasenya" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={() => {
              try {
                setSession(loginWithPassword(email, password));
                setStatus('Sessió iniciada amb password.');
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Error autenticant.');
              }
            }}>Entrar / Registrar</button>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded border text-sm" onClick={() => { setSession(loginWithProvider('google')); setStatus('Sessió Google simulada iniciada.'); }}>Google</button>
              <button className="px-3 py-2 rounded border text-sm" onClick={() => { setSession(loginWithProvider('apple')); setStatus('Sessió Apple simulada iniciada.'); }}>Apple</button>
              <button className="px-3 py-2 rounded border text-sm" onClick={async () => {
                try {
                  setSession(await loginWithPasskey());
                  setStatus('Sessió passkey iniciada.');
                } catch (error) {
                  setStatus(error instanceof Error ? error.message : 'Error amb passkey.');
                }
              }}>Passkey</button>
            </div>
            <button className="px-3 py-2 rounded border" onClick={() => { logout(); refreshState(); setStatus('Sessió tancada.'); }}>Sortir</button>
          </div>
        </div>

        <div className="p-3 border rounded-lg">
          <p className="text-sm">Estat: <strong>{navigator.onLine ? 'Online' : 'Offline'}</strong></p>
          <p className="text-sm">Pendents des de l'última sync: <strong>{pendingCount}</strong></p>
          <p className="text-sm">Última sync: <strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'mai'}</strong></p>
          <button disabled={syncing} className="mt-3 px-3 py-2 rounded bg-slate-800 text-white disabled:opacity-50" onClick={() => runSync()}>
            {syncing ? 'Sincronitzant...' : 'Sincronitzar ara'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-3">
          <h3 className="font-medium mb-2">Afegir FET</h3>
          <div className="flex gap-2 flex-col">
            <input className="px-3 py-2 border rounded" placeholder="NAME" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <input className="px-3 py-2 border rounded" placeholder="GUEST.csi" value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)} />
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={addFet}>Guardar</button>
          </div>

          <ul className="mt-3 space-y-2 max-h-56 overflow-auto">
            {fets.map((fet) => (
              <li key={fet.id} className="flex justify-between text-sm border rounded px-2 py-1">
                <span>[&quot;{fet.name}&quot; / {fet.owner}]</span>
                <button onClick={() => { deleteFet(fet.id); refreshState(); }} className="text-red-700">Eliminar</button>
              </li>
            ))}
            {!fets.length && <li className="text-sm text-slate-500">Encara no hi ha registres.</li>}
          </ul>
        </div>

        <div className="border rounded-lg p-3">
          <h3 className="font-medium mb-2">Importar / Exportar</h3>
          <button className="px-3 py-2 rounded border mb-3" onClick={exportDocument}>Exportar document</button>

          <div className="flex items-center gap-4 mb-2 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace
            </label>
          </div>

          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              void handleImport(file);
            }}
          />
        </div>
      </div>

      {status && <p className="mt-4 text-sm text-slate-700">{status}</p>}
    </section>
  );
}
