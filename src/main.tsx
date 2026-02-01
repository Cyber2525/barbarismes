import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simple installation state manager
const InstallationManager = {
  isInitialized: false,
  
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    if (!('serviceWorker' in navigator)) return;
    
    // Only register if offline mode was previously enabled
    if (localStorage.getItem('offlineModeEnabled') === 'true') {
      this.registerServiceWorker();
    }
    
    // Setup global event listeners
    this.setupEventListeners();
  },
  
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/serviceWorker.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[v0] Service Worker registered');
      
      // Claim all clients immediately
      if (registration.active) {
        registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
      }
      
      // If there's a waiting worker, skip it to activate the new one
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('[v0] Service Worker registration failed:', error);
      localStorage.removeItem('offlineModeEnabled');
    }
  },
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('[v0] App came online');
      if (navigator.serviceWorker.controller && localStorage.getItem('offlineModeEnabled') === 'true') {
        // Notify SW about connectivity
        navigator.serviceWorker.controller.postMessage({
          type: 'CONNECTIVITY_CHANGE',
          isOnline: true
        });
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('[v0] App went offline');
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CONNECTIVITY_CHANGE',
          isOnline: false
        });
      }
    });
  }
};

// Initialize when page loads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    InstallationManager.init();
  });
  
  // Listen for service worker messages at the global level
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;
    
    const { type, data } = event.data;
    
    // Forward important messages to UI
    if (type === 'OFFLINE_READY' || type === 'CACHE_ALL_COMPLETE') {
      localStorage.setItem('offlineModeEnabled', 'true');
      window.dispatchEvent(new CustomEvent('installation-complete'));
    } else if (type === 'INSTALLATION_ERROR') {
      window.dispatchEvent(new CustomEvent('installation-error', { detail: data }));
    } else if (type === 'CACHE_PROGRESS') {
      window.dispatchEvent(new CustomEvent('cache-progress', { detail: data }));
    } else if (type === 'CACHE_STATUS') {
      window.dispatchEvent(new CustomEvent('cache-status-check', { detail: data }));
    }
  });
}
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
