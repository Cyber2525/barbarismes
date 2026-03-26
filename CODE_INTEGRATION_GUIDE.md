# Code Integration Guide

This guide shows developers how to integrate the new cloud sync and auth features into their code.

## Using the Auth System

### Import the Auth Hook
```typescript
import { useAuth } from './context/AuthContext';
```

### Access User Info
```typescript
function MyComponent() {
  const { user, isLoading, isOnline } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Email: {user.email}</p>
      <p>Provider: {user.provider}</p>
      <p>Online: {isOnline ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Login/Logout
```typescript
function AuthComponent() {
  const { user, loginWithGoogle, loginWithApple, logout } = useAuth();

  return (
    <div>
      {user ? (
        <>
          <p>Logged in as {user.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <button onClick={loginWithGoogle}>Login with Google</button>
          <button onClick={loginWithApple}>Login with Apple</button>
        </>
      )}
    </div>
  );
}
```

### Sync Progress
```typescript
function SyncComponent() {
  const { syncProgress, isOnline } = useAuth();

  const handleSync = async () => {
    const success = await syncProgress();
    if (success) {
      console.log('Synced successfully!');
    }
  };

  return (
    <button onClick={handleSync} disabled={!isOnline}>
      {isOnline ? 'Sync' : 'Offline'}
    </button>
  );
}
```

## Using the Done Items System

### Mark Items Done/Undone
```typescript
import { 
  markAsDone, 
  unmarkAsDone, 
  toggleDone, 
  getDoneItems 
} from './utils/doneItems';

// Mark item as done
markAsDone('barbarism1');

// Unmark item
unmarkAsDone('barbarism1');

// Toggle (automatic sync if logged in)
toggleDone('barbarism1');

// Get all done items
const doneItems = getDoneItems(); // Returns Set<string>
const doneArray = Array.from(doneItems);
```

**Note:** These operations automatically queue for cloud sync if the user is logged in!

## Using the Offline Queue

### Direct Access (Advanced)
```typescript
import { 
  getOfflineQueue, 
  addToOfflineQueue,
  syncOfflineQueue 
} from './lib/sync';

// Get pending operations
const queue = getOfflineQueue();
console.log('Pending operations:', queue);

// Manually add operation
addToOfflineQueue('add', 'new-item');

// Manually sync
const { user } = useAuth();
if (user) {
  const success = await syncOfflineQueue(user.id);
  console.log('Sync result:', success);
}
```

## Using Export/Import

### Export Data
```typescript
import { 
  exportToCSI, 
  generateCSIFilename,
  downloadCSIFile 
} from './lib/csiFormat';
import { getDoneItems } from './utils/doneItems';

function ExportButton() {
  const handleExport = () => {
    const doneItems = Array.from(getDoneItems());
    const content = exportToCSI(
      doneItems, 
      [], // dialectItems (empty for now)
      'MyBackup', 
      'NAME'
    );
    const fileName = generateCSIFilename('MyBackup', 'NAME');
    downloadCSIFile(content, fileName);
  };

  return <button onClick={handleExport}>Export</button>;
}
```

### Import Data
```typescript
import { 
  importFromCSI, 
  mergeCSIData, 
  replaceCSIData 
} from './lib/csiFormat';

function ImportButton() {
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csi';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const content = await file.text();
      const imported = importFromCSI(content);

      if (!imported) {
        alert('Invalid CSI file');
        return;
      }

      // Option 1: Merge
      const current = { 
        doneItems: Array.from(getDoneItems()), 
        doneDialectItems: [] 
      };
      const merged = mergeCSIData(current, imported);
      localStorage.setItem(
        'doneBarbarismes', 
        JSON.stringify(merged.doneItems)
      );

      // Option 2: Replace
      // const replaced = replaceCSIData(imported);
      // localStorage.setItem(
      //   'doneBarbarismes', 
      //   JSON.stringify(replaced.doneItems)
      // );

      window.location.reload();
    };
    input.click();
  };

  return <button onClick={handleImport}>Import</button>;
}
```

## Checking Online Status

```typescript
import { useAuth } from './context/AuthContext';

function StatusComponent() {
  const { isOnline } = useAuth();

  return (
    <div>
      {isOnline ? (
        <span className="text-green-500">🟢 Online</span>
      ) : (
        <span className="text-red-500">🔴 Offline</span>
      )}
    </div>
  );
}
```

## Listen for Auth Changes

```typescript
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

function AuthChangeListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('User logged in:', user.email);
    } else {
      console.log('User logged out');
    }
  }, [user]);

  return null;
}
```

## Setup Supabase Client Directly

```typescript
import { supabase } from './lib/supabase';

// Use for direct database operations (advanced)
async function getFullUserProgress(userId: string) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

## Complete Example Component

```typescript
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { markAsDone, getDoneItems, toggleDone } from './utils/doneItems';
import { exportToCSI, downloadCSIFile, generateCSIFilename } from './lib/csiFormat';

export function CompleteExample() {
  const { user, isOnline, loginWithGoogle, logout, syncProgress } = useAuth();
  const [items, setItems] = useState<string[]>([]);

  const handleMarkDone = (item: string) => {
    toggleDone(item);
    updateItems();
  };

  const updateItems = () => {
    const done = Array.from(getDoneItems());
    setItems(done);
  };

  const handleExport = () => {
    const content = exportToCSI(items, [], user?.name || 'Export', 'NAME');
    const fileName = generateCSIFilename(user?.name || 'Export', 'NAME');
    downloadCSIFile(content, fileName);
  };

  const handleSync = async () => {
    const success = await syncProgress();
    if (success) {
      console.log('Synced!');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Auth Status */}
      <div className="p-3 bg-blue-100 rounded">
        {user ? (
          <>
            <p>✅ Logged in: {user.email}</p>
            <button 
              onClick={logout}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <p>❌ Not logged in</p>
            <button 
              onClick={loginWithGoogle}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Login with Google
            </button>
          </>
        )}
      </div>

      {/* Online Status */}
      <div className="p-3 bg-gray-100 rounded">
        {isOnline ? (
          <p>🟢 Online</p>
        ) : (
          <p>🔴 Offline (Changes will sync when online)</p>
        )}
      </div>

      {/* Done Items */}
      <div className="space-y-2">
        <h2 className="font-bold">Done Items ({items.length})</h2>
        {['item1', 'item2', 'item3'].map(item => (
          <button
            key={item}
            onClick={() => handleMarkDone(item)}
            className={`w-full p-2 rounded text-left ${
              items.includes(item)
                ? 'bg-green-200'
                : 'bg-gray-200'
            }`}
          >
            {items.includes(item) ? '✅' : '☐'} {item}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button 
          onClick={handleSync}
          disabled={!isOnline}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isOnline ? 'Sync' : 'Offline'}
        </button>
        <button 
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded"
        >
          Export
        </button>
      </div>
    </div>
  );
}
```

## Type Definitions

```typescript
// User type
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  provider: 'google' | 'apple' | 'none';
  lastSyncTime?: Date;
}

// CSI Export type
interface CSIExportData {
  version: '1.0';
  exportDate: string;
  userName: string;
  userType: 'NAME' | 'GUEST';
  doneItems: string[];
  doneDialectItems: string[];
}

// Offline queue item
interface SyncQueueItem {
  id: string;
  operation: 'add' | 'remove';
  itemName: string;
  timestamp: number;
  synced: boolean;
}
```

## API Reference Quick Link

For complete API documentation, see `CLOUD_SYNC_README.md`

## Common Patterns

### Pattern 1: Show Sync Status
```typescript
const { isOnline, syncProgress } = useAuth();

<button onClick={syncProgress} disabled={!isOnline}>
  {isOnline ? '☁️ Sync' : '📵 Offline'}
</button>
```

### Pattern 2: Mark Done and Sync
```typescript
const { user, syncProgress } = useAuth();

const handleMarkDone = async (item: string) => {
  markAsDone(item);
  if (user) {
    await syncProgress();
  }
};
```

### Pattern 3: Auto-Export on Logout
```typescript
const { logout } = useAuth();

const handleLogout = async () => {
  const doneItems = Array.from(getDoneItems());
  const content = exportToCSI(doneItems, [], 'Backup', 'GUEST');
  downloadCSIFile(content, 'backup.csi');
  await logout();
};
```

---

**Need more examples?** Check the component files:
- `src/components/AuthButton.tsx` - Full implementation example
- `src/context/AuthContext.tsx` - Hook implementation
- `src/utils/doneItems.ts` - Integration with existing code
