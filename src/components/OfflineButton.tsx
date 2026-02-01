import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Check, CircleAlert, Download, RefreshCw, Timer, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { SwipeToConfirm } from './SwipeToConfirm';

// Installation status enum for clarity
type InstallStatus = 'unknown' | 'checking' | 'installed' | 'not-installed';

// Cache name must match service worker
const EXPECTED_CACHE_NAME = 'mots-correctes-cache-v4';

export function OfflineButton() {
  // Use a more explicit status instead of boolean
  const [installStatus, setInstallStatus] = useState<InstallStatus>('unknown');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationError, setInstallationError] = useState<string | null>(null);
  const [cachingProgress, setCachingProgress] = useState(0);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeComplete, setSwipeComplete] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [countdownValue, setCountdownValue] = useState(5);
  const [isMobile, setIsMobile] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Derived state for backwards compatibility
  const isInstalled = installStatus === 'installed';
  
  // Robust cache check that works both online and offline
  const checkCacheDirectly = useCallback(async (): Promise<boolean> => {
    try {
      if (!('caches' in window)) {
        console.log('[v0] Cache API not available');
        return false;
      }
      
      // Check if our cache exists
      const hasCache = await caches.has(EXPECTED_CACHE_NAME);
      if (!hasCache) {
        console.log('[v0] Cache does not exist');
        return false;
      }
      
      // Open cache and check for critical files
      const cache = await caches.open(EXPECTED_CACHE_NAME);
      const keys = await cache.keys();
      
      console.log(`[v0] Cache has ${keys.length} items`);
      
      // Check for minimum critical files (/, /index.html, /manifest.json)
      const criticalUrls = ['/', '/index.html', '/manifest.json'];
      const cachedUrls = keys.map(req => new URL(req.url).pathname);
      
      const hasCriticalFiles = criticalUrls.every(url => 
        cachedUrls.includes(url) || cachedUrls.some(cached => cached.endsWith(url))
      );
      
      // Also check we have at least some JS/CSS assets
      const hasAssets = cachedUrls.some(url => url.includes('/assets/'));
      
      const isValid = keys.length >= 3 && (hasCriticalFiles || hasAssets);
      
      console.log(`[v0] Cache validation: ${isValid ? 'VALID' : 'INVALID'}`, {
        itemCount: keys.length,
        hasCriticalFiles,
        hasAssets,
        criticalUrls,
        sampleCachedUrls: cachedUrls.slice(0, 5)
      });
      
      return isValid;
    } catch (error) {
      console.error('[v0] Error checking cache directly:', error);
      return false;
    }
  }, []);
  
  // Main installation check - uses multiple methods for reliability
  const determineInstallStatus = useCallback(async () => {
    console.log('[v0] Determining installation status...');
    setInstallStatus('checking');
    
    const localStorageFlag = localStorage.getItem('offlineModeEnabled') === 'true';
    console.log('[v0] localStorage flag:', localStorageFlag);
    
    // Primary check: directly verify cache exists and has content
    const cacheIsValid = await checkCacheDirectly();
    console.log('[v0] Direct cache check result:', cacheIsValid);
    
    if (cacheIsValid) {
      // Cache is valid - we're installed
      setInstallStatus('installed');
      // Ensure localStorage is in sync
      if (!localStorageFlag) {
        localStorage.setItem('offlineModeEnabled', 'true');
      }
      console.log('[v0] Status: INSTALLED (cache validated)');
      return;
    }
    
    // Cache check failed - but maybe we're in a weird state
    // If localStorage says installed but cache is gone, clear the flag
    if (localStorageFlag && !cacheIsValid) {
      console.log('[v0] localStorage says installed but cache is invalid - clearing flag');
      localStorage.removeItem('offlineModeEnabled');
    }
    
    // Secondary check: if we have a service worker controller, ask it
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[v0] Requesting cache status from service worker...');
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_CACHE_STATUS' });
      // Don't wait - the message handler will update status
      // But set a timeout to finalize status if no response
      setTimeout(() => {
        setInstallStatus(prev => prev === 'checking' ? 'not-installed' : prev);
      }, 2000);
      return;
    }
    
    // No controller and cache invalid - definitely not installed
    setInstallStatus('not-installed');
    console.log('[v0] Status: NOT INSTALLED');
  }, [checkCacheDirectly]);
  
  // Monitor online/offline status with debounce
  useEffect(() => {
    let networkStatusTimeout: NodeJS.Timeout | null = null;
    
    const handleOnlineStatus = () => {
      if (networkStatusTimeout) {
        clearTimeout(networkStatusTimeout);
      }
      
      networkStatusTimeout = setTimeout(() => {
        const isCurrentlyOffline = !navigator.onLine;
        setIsOffline(isCurrentlyOffline);
        
        // Notify service worker about connectivity status
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CONNECTIVITY_CHANGE',
            offlineMode: isCurrentlyOffline
          });
        }
        
        // If we go offline during installation, abort
        if (isCurrentlyOffline && isInstalling) {
          handleInstallationFailure("Connexió perduda. La instal·lació s'ha cancel·lat.");
        }
      }, 300);
    };
    
    setIsOffline(!navigator.onLine);
    
    // Listen for app updates needed
    const handleUpdateNeeded = (event: CustomEvent) => {
      console.log('[v0] Update needed event received:', event.detail);
      if (!isInstalling) {
        setUpdateAvailable(true);
        if (event.detail.reason) {
          console.log('[v0] Update reason:', event.detail.reason);
        }
      }
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    window.addEventListener('app-update-needed', handleUpdateNeeded as EventListener);
    
    return () => {
      if (networkStatusTimeout) clearTimeout(networkStatusTimeout);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      window.removeEventListener('app-update-needed', handleUpdateNeeded as EventListener);
    };
  }, [isInstalling]);
  
  // Initial installation check on mount
  useEffect(() => {
    // Run check immediately - no artificial delay
    determineInstallStatus();
    
    // Also re-check when service worker becomes ready
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        console.log('[v0] Service worker ready - re-checking status');
        // Small delay to let SW settle
        setTimeout(() => determineInstallStatus(), 100);
      }).catch(err => {
        console.error('[v0] Service worker ready failed:', err);
      });
    }
  }, [determineInstallStatus]);
  
  // Service worker message handler
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THROTTLE = 50;
    let lastProgressValue = 0;
    
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;
      
      console.log('[v0] SW message:', event.data.type, event.data);
      
      switch (event.data.type) {
        case 'OFFLINE_READY':
        case 'CACHE_ALL_COMPLETE':
          setInstallStatus('installed');
          setIsInstalling(false);
          setUpdateAvailable(false);
          setCachingProgress(100);
          localStorage.setItem('offlineModeEnabled', 'true');
          if (event.data.version) localStorage.setItem('appVersion', event.data.version);
          if (event.data.cacheName) localStorage.setItem('cacheName', event.data.cacheName);
          console.log('[v0] Installation complete!');
          break;
          
        case 'CACHE_STATUS':
          // Service worker reports cache status with enhanced validation
          const hasValidCache = event.data.isValid ?? (event.data.exists && event.data.itemCount >= 3);
          console.log('[v0] SW cache status:', { 
            exists: event.data.exists, 
            count: event.data.itemCount, 
            hasCritical: event.data.hasCriticalFiles,
            isValid: event.data.isValid,
            finalValid: hasValidCache 
          });
          
          if (hasValidCache) {
            setInstallStatus('installed');
            localStorage.setItem('offlineModeEnabled', 'true');
          } else {
            setInstallStatus('not-installed');
            localStorage.removeItem('offlineModeEnabled');
          }
          break;
          
        case 'CACHE_ALL_FAILED':
          handleInstallationFailure(event.data.error || 'Unknown error');
          break;
          
        case 'CACHING_PROGRESS':
          const now = Date.now();
          const progressValue = Math.floor(event.data.progress);
          
          if (now - lastProgressUpdate > PROGRESS_UPDATE_THROTTLE || 
              event.data.progress >= 99 || 
              progressValue - lastProgressValue >= 5) {
            lastProgressUpdate = now;
            lastProgressValue = progressValue;
            setCachingProgress(progressValue);
            
            if (event.data.isAutoUpdate && !isInstalling) {
              setIsInstalling(true);
              setUpdateAvailable(true);
            }
          }
          break;
          
        case 'VERSION_INFO':
          const storedVersion = localStorage.getItem('appVersion');
          if (storedVersion && storedVersion !== event.data.version) {
            setUpdateAvailable(true);
          }
          break;
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, [isInstalling]);
  
  // Legacy function kept for compatibility
  const checkOfflineStatus = useCallback(() => {
    determineInstallStatus();
  }, [determineInstallStatus]);

  
  const installServiceWorker = () => {
    // Don't proceed if offline or already installing
    if (isOffline || isInstalling) {
      return;
    }
    
    const isUpdating = updateAvailable;
    
    if (!('serviceWorker' in navigator)) {
      alert('El teu navegador no suporta el mode offline. Prova amb Chrome, Firefox, o Edge.');
      return;
    }
    
    setIsInstalling(true);
    setInstallationError(null);
    setCachingProgress(0); // Start at 0% for real progress tracking // Start at 0% for real progress tracking
    
    console.log('Registering service worker...');
    
    // Check connection before starting
    if (!navigator.onLine) {
      console.error('Network connection unavailable');
      handleInstallationFailure('Revisa la connexió a internet i torna-ho a probar');
      return;
    }
    
    // Create a timeout to prevent hanging installation
    const installTimeout = setTimeout(() => {
      if (isInstalling) {
        handleInstallationFailure('La instal·lació ha excedit el temps d\'espera');
      }
    }, 45000); // 45 second timeout for larger downloads
    
    // Register the service worker if not already registered
    navigator.serviceWorker.register('/serviceWorker.js', { 
      scope: '/',
      updateViaCache: 'none'  // Don't use cached version of service worker
    })
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        // Don't set a hardcoded progress here, let the service worker report actual progress
        
        // Ensure the service worker is activated
        if (registration.installing) {
          console.log('Service worker is installing');
          const sw = registration.installing || registration.waiting;
          
          // Monitor the state changes of the service worker
          sw.addEventListener('statechange', (e) => {
            console.log('Service worker state changed:', sw.state);
            if (sw.state === 'activated') {
              // Now we can tell the service worker to cache all resources
              clearTimeout(installTimeout); // Clear timeout as we're proceeding
              
              // Double-check we're still online before proceeding
              if (!navigator.onLine) {
                handleInstallationFailure('Revisa la connexió a internet i torna-ho a probar');
                return;
              }
              
              activateOfflineMode(registration);
            }
          });
        } else if (registration.active) {
          console.log('Service worker is already active');
          clearTimeout(installTimeout); // Clear timeout as we're proceeding
          activateOfflineMode(registration);
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
        clearTimeout(installTimeout);
        handleInstallationFailure(error.message);
      });
  };
  
  // Centralized function to handle installation failures
  const handleInstallationFailure = (errorMessage: string) => {
    console.error('Installation failed:', errorMessage);
    
    // Reset all installation states
    setIsInstalling(false);
    setCachingProgress(0);
    setUpdateAvailable(false); // Reset update state on failure
    
    // Set standardized error message for network issues, otherwise use original error
    if (errorMessage.includes('connexió') || errorMessage.includes('network')) {
      setInstallationError("Revisa la connexió a internet i torna-ho a probar");
    } else {
      setInstallationError(errorMessage || 'Error desconegut durant la instal·lació');
    }
    
    // Note: No alert() calls - using in-app error messages only
  };
  
  const activateOfflineMode = (registration: ServiceWorkerRegistration) => {
    console.log('Activating offline mode...');
    setCachingProgress(0); // Start at 0% for real progress tracking
    
    // Make sure the service worker takes control immediately
    if (registration.active && !navigator.serviceWorker.controller) {
      // If there's no controller, we need to reload to get the SW to control the page
      console.log('No controller, reloading page to activate service worker');
      window.location.reload();
      return;
    }
    
    // Signal the service worker to cache all resources
    setTimeout(() => {
      // Check if we're still online before proceeding
      if (!navigator.onLine) {
        handleInstallationFailure('Revisa la connexió a internet i torna-ho a probar');
        return;
      }
      
      if (navigator.serviceWorker.controller) {
        console.log('Sending CACHE_ALL message to service worker');
        
        // Cache all app content
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_ALL'
        });
        
        // Store user preferences and data in localStorage
        cacheLocalData();
        
        // Log whether this is an update or fresh install
        console.log(updateAvailable ? 'Starting app update...' : 'Starting fresh installation...');
        
        // Set a timeout to ensure we eventually move to "installed" state
        // even if we don't get a message back
        const maxWaitTime = 30000; // 30 seconds max wait time
        
        // Setup network monitoring during installation
        const connectionCheckInterval = setInterval(() => {
          if (!navigator.onLine && isInstalling) {
            clearInterval(connectionCheckInterval);
            handleInstallationFailure('Revisa la connexió a internet i torna-ho a probar');
          }
        }, 1000);
        
        // Monitor network connectivity during installation
        setTimeout(() => {
          clearInterval(connectionCheckInterval);
          
          if (installStatus !== 'installed' && isInstalling) {
            // Check if we're still online
            if (!navigator.onLine) {
              handleInstallationFailure('Problema de xarxa, torna-ho a intentar');
              return;
            }
            
            // Mark as complete - we'll let the service worker handle the actual final percentage
            console.log('Cache timeout reached, considering installation complete');
            setInstallStatus('installed');
            setIsInstalling(false);
            setUpdateAvailable(false);
            setCachingProgress(100);
            localStorage.setItem('offlineModeEnabled', 'true');
          }
        }, maxWaitTime);
      } else {
        // No toast notifications to handle
                  
                  handleInstallationFailure('No s\'ha pogut activar el service worker. Recarrega la pàgina i torna-ho a provar.');
      }
    }, 1000);
  };
  
  const cacheLocalData = () => {
    // Store configuration and user data in localStorage
    localStorage.setItem('offlineModeEnabled', 'true');
    
    // We're already using localStorage for quiz state, scores and settings
    // so user data is already persisted
    
    // Explicitly save the current app state
    const currentQuizSize = localStorage.getItem('quizSize');
    const currentQuizMode = localStorage.getItem('quizMode');
    
    if (currentQuizSize) {
      localStorage.setItem('quizSize_backup', currentQuizSize);
    }
    
    if (currentQuizMode) {
      localStorage.setItem('quizMode_backup', currentQuizMode);
    }
    
    console.log('Local data cached successfully');
  };
  
  const uninstallOfflineMode = () => {
    // Only proceed if swipe is complete
    if (!swipeComplete) {
      return;
    }
    
    console.log('Uninstalling offline mode...');
    setShowUninstallConfirm(false);
    
    // Reset swipe state so it's ready if the dialog is reopened
    resetSwipeState();
    
    // No toast notification for uninstalling
    
    // Create a promise chain for all uninstallation tasks
    Promise.all([
      // 1. Unregister service workers
      new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations()
            .then(registrations => {
              return Promise.all(
                registrations.map(registration => registration.unregister())
              );
            })
            .then(() => {
              console.log('All service workers unregistered');
              resolve(true);
            })
            .catch(error => {
              console.error('Error unregistering service workers:', error);
              resolve(false);
            });
        } else {
          resolve(true);
        }
      }),
      
      // 2. Clear all caches
      new Promise((resolve) => {
        if ('caches' in window) {
          caches.keys()
            .then(cacheNames => {
              return Promise.all(
                cacheNames.map(cacheName => {
                  console.log('Deleting cache:', cacheName);
                  return caches.delete(cacheName);
                })
              );
            })
            .then(() => {
              console.log('All caches cleared');
              resolve(true);
            })
            .catch(error => {
              console.error('Error clearing caches:', error);
              resolve(false);
            });
        } else {
          resolve(true);
        }
      })
    ])
    .then(() => {
      // Reset offline state in localStorage
      localStorage.removeItem('offlineModeEnabled');
      localStorage.removeItem('appVersion');
      localStorage.removeItem('cacheName');
      
      // Reset component state
      setInstallStatus('not-installed');
      
      // Reset swipe state so it's ready if the dialog is reopened
      resetSwipeState();
      
      console.log('Offline mode uninstalled successfully');
    })
    .catch((error) => {
      console.error('Uninstallation error:', error);
      
      // Reset swipe state even in case of error
      resetSwipeState();
      
      console.log('Uninstallation error:', error);
    });
  };
  
  // Handle swipe to confirm
  const handleSwipeComplete = () => {
    setSwipeComplete(true);
  };
  
  // Reset swipe state and countdown when closing modal
  const resetSwipeState = () => {
    setSwipeProgress(0);
    setSwipeComplete(false);
    setSliderPosition(0);
    setCountdownValue(5);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };
  
  // State for controlling modal animation
  const [isExitingModal, setIsExitingModal] = useState(false);
  
  // Handle modal close with animation
  const handleCloseModal = () => {
    setIsExitingModal(true);
    setTimeout(() => {
      setIsExitingModal(false);
      setShowUninstallConfirm(false);
      resetSwipeState();
    }, 200); // Match animation duration
  };
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle automatic updates
  useEffect(() => {
    const handleAutoUpdate = (event: Event) => {
      console.log('Automatic update process started', event);
      
      // Check if we have event details with custom label
      const customEvent = event as CustomEvent;
      const updateLabel = customEvent.detail?.label || 'Actualitzant';
      const updateTrigger = customEvent.detail?.trigger || 'auto';
      
      console.log(`Update process: ${updateLabel} (trigger: ${updateTrigger})`);
      
      if (!isOffline && !isInstalling) {
        setIsInstalling(true);
        setUpdateAvailable(true);
        setCachingProgress(0); // Start at 0% for real progress tracking
        console.log('UI updated to show automatic update progress');
      }
    };
    
    // Handler for update in progress events
    const handleUpdateInProgress = (event: Event) => {
      const customEvent = event as CustomEvent;
      const inProgress = customEvent.detail?.inProgress || false;
      
      if (inProgress && !isOffline) {
        console.log('Update in progress detected, updating UI state');
        setIsInstalling(true);
        setUpdateAvailable(true);
      }
    };
    
    window.addEventListener('auto-update-started', handleAutoUpdate);
    window.addEventListener('app-update-in-progress', handleUpdateInProgress);
    
    // Still handle manual update button clicks
    if (updateAvailable && !isInstalling && !isOffline) {
      // Small delay before starting the update
      const timer = setTimeout(() => {
        console.log('Automatic update started');
        installServiceWorker();
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('auto-update-started', handleAutoUpdate);
      };
    }
    
    return () => {
      window.removeEventListener('auto-update-started', handleAutoUpdate);
      window.removeEventListener('app-update-in-progress', handleUpdateInProgress);
    };
  }, [updateAvailable, isInstalling, isOffline]);
  
  // Handle countdown timer for desktop
  useEffect(() => {
    if (showUninstallConfirm && !isMobile) {
      // Reset countdown when modal opens
      setCountdownValue(5);
      setSwipeComplete(false);
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 1) {
            // When countdown reaches 0, unlock button
            clearInterval(countdownRef.current as NodeJS.Timeout);
            setSwipeComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Clear countdown when modal closes
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [showUninstallConfirm, isMobile]);

  // Control body scroll locking when modal opens/closes
  useEffect(() => {
    if (showUninstallConfirm) {
      // Lock scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    // Cleanup function to ensure scrolling is restored if component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showUninstallConfirm]);
  
  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-5 mb-4">
            <div className="flex flex-col items-center gap-4">
              {/* Status Indicator - Now at the top */}
              <div className={`w-full px-5 py-3 text-sm rounded-lg flex items-center justify-center gap-2 ${
                installStatus === 'checking' || installStatus === 'unknown'
                  ? 'bg-gray-100 text-gray-600' // Gray: Checking status
                  : isOffline 
                    ? isInstalled
                      ? 'bg-amber-100 text-amber-700' // Yellow: Offline + Downloaded
                      : 'bg-red-100 text-red-700'     // Red: Offline + Not Downloaded
                    : isInstalled 
                      ? 'bg-green-100 text-green-700' // Green: Online + Downloaded
                      : 'bg-blue-100 text-blue-700'   // Blue: Online + Not Downloaded
              }`}>
                {installStatus === 'checking' || installStatus === 'unknown' ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span className="font-medium">
                      Comprovant estat...
                    </span>
                  </>
                ) : isOffline ? (
                  <>
                    <WifiOff size={18} />
                    <span className="font-medium">
                      Sense conexió - {isInstalled ? 'Disponible offline' : 'No instalada'}
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi size={18} />
                    <span className="font-medium">
                      Amb conexió - {isInstalled ? 'Disponible offline' : 'No instalada'}
                    </span>
                  </>
                )}
              </div>
              
              {/* Install/Uninstall Button - Now below the status indicator */}
              {installStatus === 'checking' || installStatus === 'unknown' ? (
                // Show disabled button while checking
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-300 text-gray-500 cursor-not-allowed transition-all"
                >
                  <RefreshCw size={18} className="animate-spin" />
                  <span className="font-medium">Comprovant...</span>
                </button>
              ) : isInstalled && !isInstalling ? (
                <>
                  {/* Uninstall button - only shown when not updating */}
                  <button
                    onClick={() => setShowUninstallConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                  >
                    <Trash2 size={18} />
                    <span className="font-medium">Desinstalar aplicació</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={installServiceWorker}
                  disabled={isInstalling || isOffline}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg transition-all ${
                    isOffline 
                      ? "bg-gray-400 text-white cursor-not-allowed" 
                      : isInstalling 
                        ? "bg-yellow-500 text-white animate-pulse" 
                        : updateAvailable
                          ? "bg-yellow-500 text-white hover:bg-yellow-600"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isInstalling ? <RefreshCw size={18} className="animate-spin" /> : updateAvailable ? <CircleAlert size={18} className="animate-pulse" /> : <Download size={18} />}
                  <span className="font-medium">
                    {isInstalling
                      ? (cachingProgress >= 95
                          ? "Finalitzant..."
                          : updateAvailable 
                            ? "Actualitzant..."
                            : "Instal·lant...")
                      : updateAvailable 
                        ? 'Actualització disponible' 
                        : 'Instal·lar aplicació'}
                  </span>
                </button>
              )}
            </div>
            
            {/* Error message */}
            {installationError && (
              <div className="mt-3 px-4 py-2 text-sm rounded-md bg-red-100 text-red-700 flex items-center gap-2">
                <CircleAlert size={16} />
                <span>{installationError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Uninstall Confirmation Modal */}
      {showUninstallConfirm && (
        <div className={`modal-container bg-black bg-opacity-60 p-4 ${isExitingModal ? 'exiting' : ''}`}>
          <div className={`modal-content bg-white rounded-lg p-6 ${isMobile ? 'max-w-md' : 'max-w-xs'} w-full shadow-xl ${isExitingModal ? 'exiting' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-800">Confirmar desinstal·lació</h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Tancar"
              >
                <X size={20} />
              </button>
            </div>
            
            
            
            <div className="mb-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <p className="font-medium">Atenció!</p>
                <p className="text-sm">Aquesta acció eliminarà el mode offline i no podràs utilitzar l'aplicació sense connexió a internet.</p>
              </div>
              
              {isMobile ? (
                <>
                  {/* Swipe to confirm component (mobile only) */}
                  <div className="relative h-12 bg-gray-100 rounded-lg mt-3 overflow-hidden">
                    {/* Swipeable element */}
                    {!swipeComplete ? (
                      <SwipeToConfirm 
                        onSwipeProgress={setSwipeProgress} 
                        onSwipeComplete={handleSwipeComplete}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500 text-white">
                        <Check size={20} className="mr-2" />
                        <span className="font-medium">Confirmat</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Desktop countdown - simplified with just a message */
                <div className="text-center my-4">
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-between">
              <button
                onClick={handleCloseModal}
                className="py-2 px-5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-300 focus:outline-none"
              >
                Cancel·lar
              </button>
              <button
                onClick={uninstallOfflineMode}
                disabled={!swipeComplete}
                className={`py-2 px-5 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                  swipeComplete
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md focus:ring-2 focus:ring-red-300 focus:outline-none'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {!isMobile && !swipeComplete ? (
                  <>
                    <Timer size={16} className="animate-pulse" />
                    <span>Espera ({countdownValue}s)</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{isMobile ? "Confirmar" : "Confirmar"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
