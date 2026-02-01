import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize service worker if it's enabled
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if offline mode was enabled previously
    if (localStorage.getItem('offlineModeEnabled') === 'true') {
      console.log('Offline mode previously enabled, registering service worker...');
      
      // Register with a slight delay to ensure page has loaded
      // CHANGED: Reduced from 1000 to 100 for faster registration
      setTimeout(() => {
        try {
          navigator.serviceWorker.register('/serviceWorker.js', {
            scope: '/',
            updateViaCache: 'none' // Don't use cached version of service worker
          })
            .then(registration => {
              console.log('Service Worker registered with scope:', registration.scope);
              
              // Check if we need to update
              if (registration.waiting) {
                console.log('New service worker waiting');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              
              // Force service worker to claim this client
              if (registration.active) {
                registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
              }
              
              // We no longer check versions, instead update automatically when online
              console.log('Service worker registered, automatic updates will run when online');
            })
            .catch(error => {
              console.error('Service Worker registration failed:', error);
              // Remove the offline mode flag if registration fails
              localStorage.removeItem('offlineModeEnabled');
            });
        } catch (error) {
          console.error('Error during service worker registration:', error);
          // Prevent the error from blocking app initialization
          localStorage.removeItem('offlineModeEnabled');
        }
      }, 100);
    } else {
      console.log('Offline mode not enabled. User can enable it via the download button.');
    }
  });
  
  // This function is no longer needed as we directly trigger updates when coming online
  const checkAppVersion = () => {
    console.log('App version check replaced with automatic updates');
  };
  
  // Listen for service worker messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;
    
    console.log('Received message from service worker:', event.data.type);
    
    if (event.data.type === 'OFFLINE_READY') {
      console.log('Received OFFLINE_READY message from service worker');
      localStorage.setItem('offlineModeEnabled', 'true');
    }
    else if (event.data.type === 'VERSION_INFO' || event.data.type === 'CACHE_VALIDATION') {
      // Store the current version info
      const newVersion = event.data.version;
      const newCacheName = event.data.cacheName;
      const cacheIntegrityStatus = event.data.cacheIntegrity;
      const installedVersion = localStorage.getItem('appVersion');
      const currentCacheName = localStorage.getItem('cacheName');
      
      console.log(`Version check: Current=${newVersion}, Installed=${installedVersion}`);
      console.log(`Cache check: Current=${newCacheName}, Installed=${currentCacheName}`);
      console.log(`Cache integrity: ${cacheIntegrityStatus}`);
      
      // Save new version info
      localStorage.setItem('appVersion', newVersion);
      localStorage.setItem('cacheName', newCacheName);
      
      // If version mismatch, cache mismatch, or cache corrupted and we're online, trigger reinstall
      if ((installedVersion && installedVersion !== newVersion) || 
          (currentCacheName && currentCacheName !== newCacheName) ||
          cacheIntegrityStatus === 'invalid' || 
          event.data.missingFiles) {
        console.log('Version, cache mismatch, or incomplete cache detected, triggering reinstall');
        
        // Mark that we detected an update this session
        localStorage.setItem('updateDetectedThisSession', 'true');
        
        // Dispatch custom event to trigger automatic reinstall
        console.log('Update needed, dispatching update event');
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
      // CHANGED: Reduced from 1000 to 100 for faster reaction
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
      }, 100); // Slight delay to ensure stable connection
    }
  });
  
  // Trigger update when page is fully loaded
  window.addEventListener('load', () => {
    console.log('Page fully loaded, checking for updates');
    // Only run if we're online and offline mode is enabled
    if (navigator.onLine && localStorage.getItem('offlineModeEnabled') === 'true') {
      console.log('Triggering automatic update on page load');
      
      // Short delay to ensure everything is properly initialized
      setTimeout(() => {
        // Test connectivity before update
        fetch('/', { method: 'HEAD', cache: 'no-store' })
          .then(() => {
            console.log('Page load update: Network connectivity confirmed');
            if (navigator.serviceWorker.controller) {
              // Notify UI that update is starting
              window.dispatchEvent(new CustomEvent('auto-update-started', {
                detail: { trigger: 'page-load', label: 'Actualitzant' }
              }));
              
              // Start the update process with dynamic progress tracking
              navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_ALL',
                isAutoUpdate: true,
                updateLabel: 'Actualitzant'
              });
              
              // Dispatch event to update UI
              window.dispatchEvent(new CustomEvent('auto-update-started', {
                detail: { 
                  label: 'Actualitzant',
                  trigger: 'automatic'
                }
              }));
              
              console.log('Automatic update initiated on page load');
            }
          })
          .catch(err => {
            console.log('Page load update: Network test failed', err);
          });
      }, 1500);
    }
  });
  
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
