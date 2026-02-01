import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Cache name for direct verification
const EXPECTED_CACHE_NAME = 'mots-correctes-cache-v4';

// Verify cache directly without relying on service worker
async function verifyCacheExists(): Promise<boolean> {
  try {
    if (!('caches' in window)) return false;
    const hasCache = await caches.has(EXPECTED_CACHE_NAME);
    if (!hasCache) return false;
    const cache = await caches.open(EXPECTED_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length >= 3;
  } catch {
    return false;
  }
}

// Initialize service worker if it's enabled
if ('serviceWorker' in navigator) {
  // Check cache and localStorage on load
  window.addEventListener('load', async () => {
    const localStorageFlag = localStorage.getItem('offlineModeEnabled') === 'true';
    const cacheExists = await verifyCacheExists();
    
    console.log('[v0] Page loaded. localStorage flag:', localStorageFlag, 'Cache exists:', cacheExists);
    
    // Sync localStorage with actual cache state
    if (cacheExists && !localStorageFlag) {
      console.log('[v0] Cache exists but localStorage flag missing - setting flag');
      localStorage.setItem('offlineModeEnabled', 'true');
    } else if (!cacheExists && localStorageFlag) {
      console.log('[v0] localStorage flag set but cache missing - clearing flag');
      localStorage.removeItem('offlineModeEnabled');
    }
    
    // Only register service worker if we have cache or flag
    const shouldRegister = cacheExists || localStorageFlag;
    
    if (shouldRegister) {
      console.log('[v0] Registering service worker...');
      
      try {
        const registration = await navigator.serviceWorker.register('/serviceWorker.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        
        console.log('[v0] Service Worker registered with scope:', registration.scope);
        
        // Handle waiting service worker
        if (registration.waiting) {
          console.log('[v0] New service worker waiting - activating');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Force claim
        if (registration.active) {
          console.log('[v0] Active service worker found');
          registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
        }
        
        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[v0] Service worker controller changed');
        });
        
      } catch (error) {
        console.error('[v0] Service Worker registration failed:', error);
        // Don't clear flag on registration failure - cache might still be valid
      }
    } else {
      console.log('[v0] Offline mode not enabled. User can enable it via the download button.');
    }
  });
  
  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;
    
    console.log('[v0] Received message from service worker:', event.data.type);
    
    if (event.data.type === 'OFFLINE_READY') {
      console.log('[v0] Received OFFLINE_READY message from service worker');
      localStorage.setItem('offlineModeEnabled', 'true');
    }
    else if (event.data.type === 'CACHE_STATUS') {
      // Cache status report - sync with component
      console.log('[v0] Cache status received:', { exists: event.data.exists, itemCount: event.data.itemCount });
      // Only need 3+ items (/, /index.html, /manifest.json minimum)
      if (event.data.exists && event.data.itemCount >= 3) {
        localStorage.setItem('offlineModeEnabled', 'true');
      } else {
        localStorage.removeItem('offlineModeEnabled');
      }
    }
    else if (event.data.type === 'VERSION_INFO' || event.data.type === 'CACHE_VALIDATION') {
      // Store the current version info
      const newVersion = event.data.version;
      const newCacheName = event.data.cacheName;
      const cacheIntegrityStatus = event.data.cacheIntegrity;
      const installedVersion = localStorage.getItem('appVersion');
      const currentCacheName = localStorage.getItem('cacheName');
      
      console.log(`[v0] Version check: Current=${newVersion}, Installed=${installedVersion}`);
      console.log(`[v0] Cache check: Current=${newCacheName}, Installed=${currentCacheName}`);
      console.log(`[v0] Cache integrity: ${cacheIntegrityStatus}`);
      
      // Save new version info
      localStorage.setItem('appVersion', newVersion);
      localStorage.setItem('cacheName', newCacheName);
      
      // If version mismatch, cache mismatch, or cache corrupted and we're online, trigger reinstall
      if ((installedVersion && installedVersion !== newVersion) || 
          (currentCacheName && currentCacheName !== newCacheName) ||
          cacheIntegrityStatus === 'invalid' || 
          event.data.missingFiles) {
        console.log('[v0] Version, cache mismatch, or incomplete cache detected, triggering reinstall');
        
        // Mark that we detected an update this session
        localStorage.setItem('updateDetectedThisSession', 'true');
        
        // Dispatch custom event to trigger automatic reinstall
        console.log('[v0] Update needed, dispatching update event');
        window.dispatchEvent(new CustomEvent('app-update-needed', {
          detail: {
            oldVersion: installedVersion,
            newVersion: newVersion,
            oldCache: currentCacheName,
            newCache: newCacheName,
            cacheIntegrity: cacheIntegrityStatus,
            missingFiles: event.data.missingFiles || [],
            reason: event.data.reason || 'Version or cache mismatch'
          }
        }));
      }
    }
    else if (event.data.type === 'CACHE_ALL_COMPLETE') {
      // Update stored version info after successful installation
      if (event.data.version) {
        localStorage.setItem('appVersion', event.data.version);
      }
      if (event.data.cacheName) {
        localStorage.setItem('cacheName', event.data.cacheName);
      }
      // Ensure offline mode is enabled after successful cache
      localStorage.setItem('offlineModeEnabled', 'true');
    }
  });
  
  // Update DOM when app comes online/offline
  window.addEventListener('online', () => {
    console.log('App is online');
    document.body.classList.remove('offline-mode');
    
    // Inform service worker that we're online
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTIVITY_CHANGE',
        offlineMode: false
      });
    }
    
    // Automatically update when coming online
    if (localStorage.getItem('offlineModeEnabled') === 'true') {
      console.log('App came online - initiating automatic update');
      
      // Automatic update on every online reconnection
      setTimeout(() => {
        // First perform a fetch to ensure the connection is really established
        fetch('/', { method: 'HEAD', cache: 'no-store' })
          .then(() => {
            console.log('Network connectivity confirmed, starting update process');
            // Trigger automatic update
            if (navigator.serviceWorker.controller) {
              console.log('Update process started');
              
              // Trigger UI state update through custom event
              window.dispatchEvent(new CustomEvent('app-update-in-progress', { detail: { inProgress: true } }));
              
              // Dispatch event for UI update
              window.dispatchEvent(new CustomEvent('auto-update-started'));
              
              // Start download process
              navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_ALL',
                isAutoUpdate: true
              });
            }
          })
          .catch(err => {
            console.log('Network connectivity test failed:', err);
          });
      }, 1000); // Slight delay to ensure stable connection
    }
  });
  
  // Note: Auto-update on page load is now handled in the main load event above
  // This prevents duplicate updates and race conditions
  
  window.addEventListener('offline', () => {
    console.log('App is offline');
    document.body.classList.add('offline-mode');
    
    // Inform service worker that we're offline
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTIVITY_CHANGE',
        offlineMode: true
      });
    }
  });
  
  // Check initial status
  if (!navigator.onLine) {
    document.body.classList.add('offline-mode');
    
    // Initial offline status communication to service worker
    navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CONNECTIVITY_CHANGE',
          offlineMode: true
        });
      }
    });
  } else {
    // Initial online status communication to service worker
    navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CONNECTIVITY_CHANGE',
          offlineMode: false
        });
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
