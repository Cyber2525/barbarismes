# Cloud Sync & Auth Documentation

## Overview

This system adds Google and Apple authentication with real-time cloud synchronization to the Català CSI app. Progress is automatically synced to the cloud with full offline support.

## Features

### 1. **Authentication**
- **Google Login**: Sign in with your Google account
- **Apple Login**: Sign in with your Apple ID
- **Email-based Matching**: User identification by email
- **Persistent Sessions**: Automatic session restoration on app reload

### 2. **Real-Time Cloud Sync**
- Automatic synchronization of "done" items to Supabase
- Conflict-free merging using timestamps
- Queue-based system for offline changes
- Real-time updates when online

### 3. **Offline Support**
- Full functionality without internet connection
- Automatic offline queue creation
- Conflict prevention when using multiple devices
- Automatic sync when connection is restored

### 4. **Export/Import**
- **CSI Format**: `EC-CSI-NAME(TYPE).csi` files
- **Two Import Modes**:
  - **Merge**: Combine imported items with existing data (union)
  - **Replace**: Completely replace existing data with imported data
- Both text and JSON formats supported

## Setup

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Configuration

The following tables are automatically created:

#### `user_progress` Table
```
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- done_items (array of strings)
- updated_at (timestamp)
- created_at (timestamp)
```

#### `sync_queue` Table
```
- id (UUID, primary key)
- user_id (UUID)
- operation (add/remove)
- item_name (text)
- timestamp (timestamp)
- synced (boolean)
```

### 3. OAuth Setup

#### Google
1. Go to Google Cloud Console
2. Create OAuth credentials (Web application)
3. Add redirect URI: `your-domain.com/auth/callback`
4. Add credentials to Supabase provider settings

#### Apple
1. Go to Apple Developer Portal
2. Create App ID and Keys
3. Add redirect URI: `your-domain.com/auth/callback`
4. Add credentials to Supabase provider settings

## Usage

### Login
```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, loginWithGoogle, loginWithApple, logout } = useAuth();

  return (
    <>
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
    </>
  );
}
```

### Marking Items Done

```typescript
import { markAsDone, unmarkAsDone, toggleDone } from './utils/doneItems';
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, syncProgress } = useAuth();

  const handleMarkDone = async (item: string) => {
    markAsDone(item); // Automatically queued for sync
    
    if (user) {
      await syncProgress(); // Manual sync if needed
    }
  };

  return <button onClick={() => handleMarkDone('test')}>Done</button>;
}
```

### Manual Sync

```typescript
const { isOnline, syncProgress } = useAuth();

const handleSync = async () => {
  const success = await syncProgress();
  if (success) {
    console.log('Synced successfully');
  }
};
```

### Export Data

```typescript
import { exportToCSI, downloadCSIFile, generateCSIFilename } from './lib/csiFormat';
import { getDoneItems } from './utils/doneItems';

const handleExport = () => {
  const doneItems = Array.from(getDoneItems());
  const content = exportToCSI(doneItems, [], 'MyName', 'NAME');
  const fileName = generateCSIFilename('MyName', 'NAME');
  downloadCSIFile(content, fileName);
};
```

### Import Data

```typescript
import { importFromCSI, mergeCSIData, replaceCSIData } from './lib/csiFormat';

const handleImport = async (file: File, mergeMode: boolean = true) => {
  const content = await file.text();
  const imported = importFromCSI(content);
  
  if (!imported) return;

  const current = { doneItems: Array.from(getDoneItems()), doneDialectItems: [] };
  const result = mergeMode 
    ? mergeCSIData(current, imported)
    : replaceCSIData(imported);

  localStorage.setItem('doneBarbarismes', JSON.stringify(result.doneItems));
};
```

## File Format

### CSI Export Format (Text)
```
EC-CSI-EXPORT
Version: 1.0
ExportDate: 2024-03-26T10:30:00.000Z
UserName: Student Name
UserType: NAME

[BARBARISMES]
- item1
- item2

[DIALECTES]
- dialect1
- dialect2
```

### CSI Export Format (JSON)
```json
{
  "version": "1.0",
  "exportDate": "2024-03-26T10:30:00.000Z",
  "userName": "Student Name",
  "userType": "NAME",
  "doneItems": ["item1", "item2"],
  "doneDialectItems": ["dialect1", "dialect2"]
}
```

## Offline Queue Behavior

1. **Adding Items Offline**: Items are immediately added to queue
2. **Syncing Offline**: Queue is stored locally, waiting for connection
3. **Conflict Resolution**: Timestamps ensure proper ordering
4. **Automatic Retry**: Sync automatically retries when online

Example offline scenario:
```
1. Go offline
2. Mark 5 items as done (queued locally)
3. Go online
4. Sync happens automatically or on user action
5. Items appear in cloud dashboard
```

## Multi-Device Sync

When using multiple devices:

1. **Device A** marks item X as done
2. **Device B** tries to mark same item as done
3. System detects no conflict (both same operation)
4. Both devices stay in sync

Example conflict prevention:
```
Device A: Add "barbarism1" → 10:00:00
Device B: Remove "barbarism1" → 10:00:05
Cloud State: Respects timestamp order
Result: Conflict avoided, proper sequence maintained
```

## Troubleshooting

### Sync not working
- Check internet connection: `useAuth().isOnline`
- Verify Supabase credentials in `.env.local`
- Check browser console for errors

### Lost data after import
- Always do a backup export before importing
- Test with "merge" mode first
- Use "replace" mode only when sure

### Files not downloading
- Check browser download permissions
- Verify CSI filename is valid
- Try different browser if issue persists

## Architecture

```
App
├── AuthProvider (Global Auth State)
├── AuthButton (UI Component)
├── doneItems.ts (Updated with sync)
├── sync.ts (Offline queue + cloud sync)
├── csiFormat.ts (Export/Import format)
└── supabase.ts (Supabase client)
```

## API Reference

### useAuth Hook
```typescript
{
  user: AuthUser | null;
  isLoading: boolean;
  isOnline: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  syncProgress: () => Promise<boolean>;
}
```

### Sync Functions
```typescript
// Queue operations
getOfflineQueue(): SyncQueueItem[]
addToOfflineQueue(operation, itemName): void
clearOfflineQueue(): void
markAsSynced(id): void

// Sync control
syncOfflineQueue(userId): Promise<boolean>
getLastSyncTime(): Date | null
isOnline(): boolean
setupSyncListeners(callback): () => void
```

### CSI Format Functions
```typescript
parseCSIFilename(filename): { userName, userType } | null
generateCSIFilename(userName, userType): string
exportToCSI(items, dialectItems, userName, userType): string
importFromCSI(content): CSIExportData | null
mergeCSIData(existing, imported): { doneItems, doneDialectItems }
replaceCSIData(imported): { doneItems, doneDialectItems }
downloadCSIFile(content, fileName): void
```
