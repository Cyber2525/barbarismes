# Quick Start Guide: Cloud Sync Setup

## 🚀 Getting Started

### Step 1: Add Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Install Dependencies
The `@supabase/supabase-js` package has been added to `package.json`. Install all dependencies:

```bash
npm install
# or
pnpm install
```

### Step 3: Configure Supabase OAuth

#### For Google:
1. Go to your Supabase project → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. Add authorized redirect URI: `http://localhost:5173/auth/callback` (for development)
   or your production URL

#### For Apple:
1. Go to your Supabase project → Authentication → Providers
2. Enable Apple provider  
3. Add your Apple developer credentials
4. Add authorized redirect URI same as above

### Step 4: Run the App
```bash
npm run dev
```

## 📁 New Files Created

**Core System:**
- `src/lib/supabase.ts` - Supabase client initialization
- `src/lib/sync.ts` - Offline queue & cloud sync logic
- `src/lib/csiFormat.ts` - Export/Import format handlers
- `src/context/AuthContext.tsx` - Global auth state
- `src/components/AuthButton.tsx` - Login/Logout UI
- `src/pages/AuthCallback.tsx` - OAuth callback handler

**Updated Files:**
- `src/App.tsx` - Added AuthProvider & AuthButton to UI
- `src/utils/doneItems.ts` - Integrated offline queue

**Database:**
- `scripts/001_create_user_progress.sql` - Database schema (already executed)

**Documentation:**
- `CLOUD_SYNC_README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `.env.example` - Environment template

## ✅ Features Included

1. **Authentication**
   - ✅ Google login with email matching
   - ✅ Apple login with email matching
   - ✅ Persistent sessions
   - ✅ Logout functionality

2. **Cloud Sync**
   - ✅ Real-time sync to Supabase
   - ✅ Offline queue system
   - ✅ Automatic retry on reconnect
   - ✅ Conflict-free multi-device sync

3. **Export/Import**
   - ✅ CSI format: `EC-CSI-NAME(TYPE).csi`
   - ✅ Merge mode (combine data)
   - ✅ Replace mode (overwrite data)
   - ✅ Text & JSON format support

4. **UI Components**
   - ✅ Auth button with user email
   - ✅ Online/offline indicator
   - ✅ Sync status & button
   - ✅ Export/Import controls

## 🔄 How It Works

### Regular Usage
```
1. User clicks Google/Apple button
2. Logs in via OAuth
3. User marks items as done
4. Changes automatically queued
5. If online, syncs to cloud immediately
6. If offline, syncs when reconnected
```

### Export/Import
```
1. Click "Export/Import" button
2. Choose Export → Downloads .csi file
3. On another device, click Import
4. Select .csi file
5. Choose Merge (combine) or Replace (overwrite)
6. Done!
```

## 🧪 Testing the System

1. **Test Login:**
   - Click Google button → Should redirect to Google
   - Click Apple button → Should redirect to Apple
   - Email should show in top right after login

2. **Test Offline Sync:**
   - Go to Network tab in DevTools
   - Make offline (throttling → Offline)
   - Mark 3 items as done
   - Check localStorage under `csi-offline-queue` key
   - Go back online
   - Should sync automatically

3. **Test Export/Import:**
   - Mark 5 items as done
   - Click Export → Downloads `EC-CSI-*.csi`
   - Reset/clear all done items
   - Click Import → Select the .csi file
   - Choose "Replace" mode
   - Items should reappear

4. **Test Multi-Device:**
   - Open app on two browsers
   - Log in with same account
   - Mark item on Device A
   - Refresh Device B
   - Item should appear (if sync worked)

## ⚙️ Configuration Reference

### Supabase Tables (Auto-created)

**user_progress:**
- Stores current done items per user
- Row-level security enabled
- Users can only access their own data

**sync_queue:**
- Stores pending offline operations
- Used for offline-first synchronization
- Cleaned up after successful sync

### Environment Variables

```env
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 🆘 Troubleshooting

**Problem: "Missing Supabase environment variables"**
- Solution: Check `.env.local` exists and has correct values
- Make sure to restart dev server after changes

**Problem: OAuth redirect not working**
- Solution: Add redirect URI to Supabase OAuth settings
- Use exact URL format: `http://localhost:5173/auth/callback`

**Problem: Items not syncing**
- Solution: Check DevTools Network tab for errors
- Verify user is logged in (email visible in top right)
- Check browser console for error messages

**Problem: Export/Import not working**
- Solution: Ensure file is valid .csi format
- Try text format if JSON fails
- Check browser permissions for file access

## 📖 Full Documentation

For complete documentation, API reference, and advanced usage:
- Read `CLOUD_SYNC_README.md` for full documentation
- Read `IMPLEMENTATION_SUMMARY.md` for architecture details

## 🎉 Ready to Go!

Your app now has:
- ✅ Secure Google/Apple authentication
- ✅ Real-time cloud synchronization
- ✅ Full offline support
- ✅ Export/Import functionality
- ✅ Multi-device sync

Start the dev server and test it out!
