import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simple Service Worker Manager
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register SW if offline mode was previously enabled
    const isOfflineModeEnabled = localStorage.getItem('offlineModeEnabled') === 'true';
    
    if (isOfflineModeEnabled) {
      console.log('[v0] Registering service worker...');
      
      navigator.serviceWorker.register('/serviceWorker.js', {
        scope: '/',
        updateViaCache: 'none'
      })
        .then(registration => {
          console.log('[v0] Service worker registered');
          
          // Activate waiting SW if exists
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Claim clients
          if (registration.active) {
            registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
          }
        })
        .catch(error => {
          console.error('[v0] SW registration failed:', error);
          localStorage.removeItem('offlineModeEnabled');
        });
    }
  });
  
  // Forward SW messages to window for component consumption
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;
    
    console.log('[v0] SW message:', event.data.type);
    
    // Forward to window as custom events
    window.dispatchEvent(new CustomEvent('sw-message', { 
      detail: event.data 
    }));
    
    // Handle critical messages
    if (event.data.type === 'OFFLINE_READY' || event.data.type === 'CACHE_ALL_COMPLETE') {
      localStorage.setItem('offlineModeEnabled', 'true');
    }
  });
  
  // Handle connectivity changes
  window.addEventListener('online', () => {
    console.log('[v0] Online');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTIVITY_CHANGE',
        isOnline: true
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('[v0] Offline');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTIVITY_CHANGE',
        isOnline: false
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
