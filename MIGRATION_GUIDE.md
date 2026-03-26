# Migration Guide: Adding Cloud Sync to Existing Installation

## Overview

This guide helps existing users migrate to the new cloud sync system while preserving existing data.

## Migration Steps

### Step 1: Update Dependencies

Your `package.json` now includes `@supabase/supabase-js`:

```bash
npm install
# or
pnpm install
```

### Step 2: Setup Supabase Credentials

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from project settings
3. Create `.env.local`:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Database Migration

The database schema has been created automatically via:
- `scripts/001_create_user_progress.sql`

Tables created:
- `user_progress` - Stores done items per user
- `sync_queue` - Stores offline operations

### Step 4: First Login

1. Start the app
2. Click "Google" or "Apple" button in top right
3. Complete OAuth login
4. Your existing localStorage data remains unchanged
5. Future changes will be synced to cloud

### Step 5: Export Existing Data (Recommended)

Before using the new system, backup your existing data:

```typescript
// In browser console
const doneItems = Array.from(
  new Set(JSON.parse(localStorage.getItem('doneBarbarismes') || '[]'))
);
console.log('Backup items:', doneItems);
```

Or use the built-in export:
1. Log in with Google/Apple
2. Click "Export/Import" 
3. Click "Export" button
4. Save the `.csi` file

### Step 6: Testing

Test the new features:

1. **Login & Sync:**
   - Mark a new item as done
   - Check that it syncs to cloud (Sync button shows success)
   - Logout and login again → Item should appear

2. **Offline Mode:**
   - Go offline (DevTools → Network → Offline)
   - Mark 3 items as done
   - Go back online → They should sync

3. **Export/Import:**
   - Click Export → Get .csi file
   - Clear localStorage: `localStorage.clear()`
   - Click Import → Select .csi file
   - Choose "Replace" → Data restored

## Backwards Compatibility

✅ **Fully Compatible**

- Existing localStorage data is preserved
- Can still use offline without account
- New sync is opt-in (login to enable)
- All existing features work unchanged

### What Changed

- `markAsDone()` now also queues for sync
- `toggleDone()` now also queues for sync
- `getDoneItems()` works exactly the same
- No breaking changes to existing code

## Data Privacy

- **Local Data**: Still stored in localStorage (unchanged)
- **Cloud Data**: Only synced if user is logged in
- **Encryption**: All data encrypted at Supabase
- **Access Control**: Row-Level Security prevents cross-user access

## Common Questions

### Q: Will my existing data be lost?
**A:** No. All localStorage data is preserved. You can export it anytime.

### Q: Do I have to log in?
**A:** No. App works fully offline without login. Login is optional for cloud sync.

### Q: Can I use multiple accounts?
**A:** Yes. Each account gets its own cloud data. You can export/import between them.

### Q: What if I lose my phone?
**A:** Your data is in the cloud (if you logged in). Log in on new device to recover.

### Q: How do I logout?
**A:** Click email → "Logout" button. Local data stays on device.

## Troubleshooting Migration

### Problem: OAuth redirect not working

**Solution:**
1. Check `.env.local` has correct VITE_SUPABASE_URL
2. Add redirect URI to Supabase settings: `http://localhost:5173/auth/callback`
3. Restart dev server

### Problem: "Missing Supabase environment variables"

**Solution:**
1. Verify `.env.local` exists in project root
2. Check values are correct (copy from Supabase project)
3. Restart dev server
4. Hard refresh browser (Ctrl+Shift+R)

### Problem: Items not syncing

**Solution:**
1. Check you're logged in (email should show in top right)
2. Check browser is online
3. Click "Sync" button manually
4. Check browser console for errors
5. Verify Supabase project URL is correct

### Problem: Import showing "Invalid CSI file"

**Solution:**
1. Make sure file is `.csi` format
2. Try exporting fresh file from same version
3. Check file wasn't corrupted during transfer
4. Try text format if JSON doesn't work

## Rollback (If Needed)

If you want to revert to previous version:

1. All your localStorage data is still intact
2. Delete `.env.local` to disable cloud features
3. Cloud data won't be deleted (safe backup)
4. Can re-enable anytime by adding `.env.local` back

## Next Steps

1. **Explore Export/Import**: Practice backing up your data
2. **Enable Sync**: Log in and start syncing
3. **Test Offline**: Verify offline queue works
4. **Multi-Device**: Try same account on multiple devices
5. **Read Docs**: Check `CLOUD_SYNC_README.md` for advanced usage

## Support

- Check `QUICK_START.md` for setup help
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Check `CLOUD_SYNC_README.md` for complete API reference
- Check browser console for error messages

## Summary

✅ Existing data preserved  
✅ Backwards compatible  
✅ New features optional  
✅ Easy to setup  
✅ Easy to rollback  

Your app is now ready for cloud sync!
