import { useEffect } from 'react';
import { cloudSync } from '../lib/cloudSync';

/**
 * Hook to automatically sync progress to cloud when done items change
 */
export function useCloudSync(currentEmail: string | null) {
  useEffect(() => {
    if (!currentEmail) return;

    const handleStorageChange = () => {
      const doneBarbarismes = JSON.parse(
        localStorage.getItem('doneBarbarismes') || '[]'
      );
      const doneDialectes = JSON.parse(
        localStorage.getItem('doneDialectes') || '[]'
      );

      cloudSync.saveProgress(currentEmail, doneBarbarismes, doneDialectes);
    };

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentEmail]);

  // Auto-sync on interval when online
  useEffect(() => {
    if (!currentEmail) return;

    const syncTimer = setInterval(() => {
      const status = cloudSync.getSyncStatus();
      if (status.isOnline && status.queuedItems > 0) {
        cloudSync.syncQueue();
      }
    }, 5000); // Sync every 5 seconds if there are queued items

    return () => clearInterval(syncTimer);
  }, [currentEmail]);
}
