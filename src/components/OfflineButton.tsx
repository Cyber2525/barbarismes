import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CircleAlert, Download, RefreshCw, Timer, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { SwipeToConfirm } from './SwipeToConfirm';

// Stable state enum to prevent flickering
type InstallState = 'checking' | 'not-installed' | 'installed' | 'installing' | 'error';

export function OfflineButton() {
  // Use a single state machine approach instead of multiple boolean states
  const [installState, setInstallState] = useState<InstallState>('checking');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installationError, setInstallationError] = useState<string | null>(null);
  const [cachingProgress, setCachingProgress] = useState(0);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeComplete, setSwipeComplete] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [isMobile, setIsMobile] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isExitingModal, setIsExitingModal] = useState(false);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const stateCheckRef = useRef<boolean>(false); // Prevent multiple checks
  const mountedRef = useRef(true); // Track if component is mounted
  const installStateRef = useRef<InstallState>('checking'); // Keep ref for timeout checks
  
  // Derived states for cleaner conditionals
  const isInstalled = installState === 'installed';
  const isInstalling = installState === 'installing';
  const isChecking = installState === 'checking';

  // Stable callback for setting install state with mount check
  const safeSetInstallState = useCallback((state: InstallState) => {
    if (mountedRef.current) {
      installStateRef.current = state;
      setInstallState(state);
    }
  }, []);

  // Initialize state from localStorage synchronously to prevent flicker
  useEffect(() => {
    mountedRef.current = true;
    
    // Check localStorage first for instant UI
    const offlineModeEnabled = localStorage.getItem('offlineModeEnabled') === 'true';
    
    if (offlineModeEnabled) {
      // Assume installed initially to prevent flicker, will verify with SW
      setInstallState('installed');
    } else {
      setInstallState('not-installed');
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Monitor online/offline status with debounce
  useEffect(() => {
    let networkTimeout: NodeJS.Timeout | null = null;
    
    const handleNetworkChange = () => {
      if (networkTimeout) clearTimeout(networkTimeout);
      
      networkTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        
        const currentlyOffline = !navigator.onLine;
        setIsOffline(currentlyOffline);
        
        // Notify service worker
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CONNECTIVITY_CHANGE',
            offlineMode: currentlyOffline
          });
        }
        
        // If we go offline during installation, abort
        if (currentlyOffline && installState === 'installing') {
          handleInstallationFailure("Connexio perduda. La installacio s'ha cancelat.");
        }
      }, 300);
    };
    
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    
    return () => {
      if (networkTimeout) clearTimeout(networkTimeout);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [installState]);

  // Single service worker message handler - no dependencies that would cause re-registration
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (!event.data || !mountedRef.current) return;
      
      const { type } = event.data;
      
      switch (type) {
        case 'OFFLINE_READY':
        case 'CACHE_ALL_COMPLETE':
          // Installation complete
          safeSetInstallState('installed');
          setUpdateAvailable(false);
          setCachingProgress(100);
          localStorage.setItem('offlineModeEnabled', 'true');
          if (event.data.version) {
            localStorage.setItem('appVersion', event.data.version);
          }
          break;
          
        case 'CACHE_STATUS':
          // Only update state if not currently installing
          if (installState !== 'installing') {
            const hasValidCache = event.data.exists && event.data.itemCount > 5;
            safeSetInstallState(hasValidCache ? 'installed' : 'not-installed');
            
            // Sync localStorage
            if (hasValidCache) {
              localStorage.setItem('offlineModeEnabled', 'true');
            }
          }
          break;
          
        case 'CACHE_ALL_FAILED':
          handleInstallationFailure(event.data.error || 'Error desconegut');
          break;
          
        case 'CACHING_PROGRESS':
          if (installState === 'installing' || event.data.isAutoUpdate) {
            const progress = Math.floor(event.data.progress);
            setCachingProgress(progress);
            
            // Ensure we're showing installing state for auto-updates
            if (event.data.isAutoUpdate && installState !== 'installing') {
              safeSetInstallState('installing');
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
    
    // Handle app update needed event
    const handleUpdateNeeded = (event: Event) => {
      if (!mountedRef.current || installState === 'installing') return;
      setUpdateAvailable(true);
    };
    
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    window.addEventListener('app-update-needed', handleUpdateNeeded);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      window.removeEventListener('app-update-needed', handleUpdateNeeded);
    };
  }, [installState, safeSetInstallState]);

  // Verify cache status with service worker (only once on mount after initial state set)
  useEffect(() => {
    if (stateCheckRef.current) return;
    
    const offlineModeEnabled = localStorage.getItem('offlineModeEnabled') === 'true';
    
    if (offlineModeEnabled && 'serviceWorker' in navigator) {
      // Delay verification slightly to allow SW to be ready
      const verifyTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        stateCheckRef.current = true;
        
        navigator.serviceWorker.ready.then(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CHECK_CACHE_STATUS'
            });
          }
        }).catch(() => {
          // SW not ready, but we have localStorage flag - trust it
          // This prevents flicker when offline
        });
      }, 500);
      
      return () => clearTimeout(verifyTimeout);
    } else if (!offlineModeEnabled) {
      stateCheckRef.current = true;
    }
  }, []);

  const handleInstallationFailure = useCallback((errorMessage: string) => {
    if (!mountedRef.current) return;
    
    safeSetInstallState('error');
    setCachingProgress(0);
    setUpdateAvailable(false);
    
    // Standardize network error messages
    if (errorMessage.includes('connexio') || errorMessage.includes('network')) {
      setInstallationError("Revisa la connexio a internet i torna-ho a probar");
    } else {
      setInstallationError(errorMessage || 'Error desconegut durant la installacio');
    }
    
    // Reset to not-installed after a short delay
    setTimeout(() => {
      if (mountedRef.current) {
        safeSetInstallState('not-installed');
      }
    }, 100);
  }, [safeSetInstallState]);

  const installServiceWorker = useCallback(() => {
    if (isOffline || installState === 'installing') return;
    
    if (!('serviceWorker' in navigator)) {
      alert('El teu navegador no suporta el mode offline.');
      return;
    }
    
    if (!navigator.onLine) {
      handleInstallationFailure('Revisa la connexio a internet i torna-ho a probar');
      return;
    }
    
    // Set installing state immediately
    safeSetInstallState('installing');
    setInstallationError(null);
    setCachingProgress(0);
    
    // Installation timeout
    const installTimeout = setTimeout(() => {
      if (installStateRef.current === 'installing') {
        handleInstallationFailure("La installacio ha excedit el temps d'espera");
      }
    }, 45000);
    
    navigator.serviceWorker.register('/serviceWorker.js', {
      scope: '/',
      updateViaCache: 'none'
    })
      .then((registration) => {
        const sw = registration.installing || registration.waiting || registration.active;
        
        if (registration.active) {
          clearTimeout(installTimeout);
          activateOfflineMode(registration);
        } else if (sw) {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
              clearTimeout(installTimeout);
              if (navigator.onLine) {
                activateOfflineMode(registration);
              } else {
                handleInstallationFailure('Revisa la connexio a internet i torna-ho a probar');
              }
            }
          });
        }
      })
      .catch((error) => {
        clearTimeout(installTimeout);
        handleInstallationFailure(error.message);
      });
  }, [isOffline, installState, handleInstallationFailure, safeSetInstallState]);

  const activateOfflineMode = useCallback((registration: ServiceWorkerRegistration) => {
    setCachingProgress(0);
    
    if (registration.active && !navigator.serviceWorker.controller) {
      window.location.reload();
      return;
    }
    
    setTimeout(() => {
      if (!navigator.onLine) {
        handleInstallationFailure('Revisa la connexio a internet i torna-ho a probar');
        return;
      }
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_ALL'
        });
        
        // Store user preferences
        localStorage.setItem('offlineModeEnabled', 'true');
        
        // Fallback timeout if no response
        const maxWaitTime = 30000;
        setTimeout(() => {
          if (mountedRef.current && installState === 'installing') {
            if (!navigator.onLine) {
              handleInstallationFailure('Problema de xarxa, torna-ho a intentar');
              return;
            }
            // Consider complete if timeout reached
            safeSetInstallState('installed');
            setCachingProgress(100);
            localStorage.setItem('offlineModeEnabled', 'true');
          }
        }, maxWaitTime);
      } else {
        handleInstallationFailure("No s'ha pogut activar el service worker.");
      }
    }, 500);
  }, [handleInstallationFailure, installState, safeSetInstallState]);

  const uninstallOfflineMode = useCallback(() => {
    if (!swipeComplete) return;
    
    setShowUninstallConfirm(false);
    resetSwipeState();
    
    Promise.all([
      // Unregister service workers
      new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations()
            .then(registrations => Promise.all(registrations.map(r => r.unregister())))
            .then(() => resolve(true))
            .catch(() => resolve(false));
        } else {
          resolve(true);
        }
      }),
      // Clear caches
      new Promise((resolve) => {
        if ('caches' in window) {
          caches.keys()
            .then(names => Promise.all(names.map(name => caches.delete(name))))
            .then(() => resolve(true))
            .catch(() => resolve(false));
        } else {
          resolve(true);
        }
      })
    ]).then(() => {
      localStorage.removeItem('offlineModeEnabled');
      localStorage.removeItem('appVersion');
      localStorage.removeItem('cacheName');
      safeSetInstallState('not-installed');
      setUpdateAvailable(false);
      resetSwipeState();
    });
  }, [swipeComplete, safeSetInstallState]);

  const handleSwipeComplete = useCallback(() => {
    setSwipeComplete(true);
  }, []);

  const resetSwipeState = useCallback(() => {
    setSwipeProgress(0);
    setSwipeComplete(false);
    setCountdownValue(5);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsExitingModal(true);
    setTimeout(() => {
      setIsExitingModal(false);
      setShowUninstallConfirm(false);
      resetSwipeState();
    }, 200);
  }, [resetSwipeState]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle automatic updates
  useEffect(() => {
    const handleAutoUpdate = () => {
      if (!isOffline && installState !== 'installing') {
        safeSetInstallState('installing');
        setUpdateAvailable(true);
        setCachingProgress(0);
      }
    };
    
    window.addEventListener('auto-update-started', handleAutoUpdate);
    window.addEventListener('app-update-in-progress', handleAutoUpdate);
    
    return () => {
      window.removeEventListener('auto-update-started', handleAutoUpdate);
      window.removeEventListener('app-update-in-progress', handleAutoUpdate);
    };
  }, [isOffline, installState, safeSetInstallState]);

  // Desktop countdown timer
  useEffect(() => {
    if (showUninstallConfirm && !isMobile) {
      setCountdownValue(5);
      setSwipeComplete(false);
      
      countdownRef.current = setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current as NodeJS.Timeout);
            setSwipeComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showUninstallConfirm, isMobile]);

  // Body scroll lock for modal
  useEffect(() => {
    if (showUninstallConfirm) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showUninstallConfirm]);

  // Get status indicator styles and text
  const getStatusConfig = () => {
    if (isOffline) {
      return isInstalled
        ? { bg: 'bg-amber-100', text: 'text-amber-700', icon: WifiOff, message: 'Sense conexio - Disponible offline' }
        : { bg: 'bg-red-100', text: 'text-red-700', icon: WifiOff, message: 'Sense conexio - No instalada' };
    }
    return isInstalled
      ? { bg: 'bg-green-100', text: 'text-green-700', icon: Wifi, message: 'Amb conexio - Disponible offline' }
      : { bg: 'bg-blue-100', text: 'text-blue-700', icon: Wifi, message: 'Amb conexio - No instalada' };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Get button config
  const getButtonConfig = () => {
    if (isOffline) {
      return { disabled: true, bg: 'bg-gray-400 cursor-not-allowed', icon: Download, text: 'Instalar aplicacio' };
    }
    if (isInstalling) {
      const text = cachingProgress >= 95 
        ? "Finalitzant..." 
        : updateAvailable 
          ? "Actualitzant..." 
          : "Instalant...";
      return { disabled: true, bg: 'bg-yellow-500 animate-pulse', icon: RefreshCw, text, spin: true };
    }
    if (updateAvailable) {
      return { disabled: false, bg: 'bg-yellow-500 hover:bg-yellow-600', icon: CircleAlert, text: 'Actualitzacio disponible', pulse: true };
    }
    return { disabled: false, bg: 'bg-blue-600 hover:bg-blue-700', icon: Download, text: 'Instalar aplicacio' };
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-5 mb-4">
            <div className="flex flex-col items-center gap-4">
              {/* Status Indicator */}
              <div className={`w-full px-5 py-3 text-sm rounded-lg flex items-center justify-center gap-2 ${statusConfig.bg} ${statusConfig.text}`}>
                <StatusIcon size={18} />
                <span className="font-medium">{statusConfig.message}</span>
              </div>
              
              {/* Install/Uninstall Button */}
              {isInstalled && !isInstalling ? (
                <button
                  onClick={() => setShowUninstallConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all"
                >
                  <Trash2 size={18} />
                  <span className="font-medium">Desinstalar aplicacio</span>
                </button>
              ) : (
                <button
                  onClick={installServiceWorker}
                  disabled={buttonConfig.disabled}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white transition-all ${buttonConfig.bg}`}
                >
                  <ButtonIcon 
                    size={18} 
                    className={`${buttonConfig.spin ? 'animate-spin' : ''} ${buttonConfig.pulse ? 'animate-pulse' : ''}`} 
                  />
                  <span className="font-medium">{buttonConfig.text}</span>
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
              <h3 className="text-xl font-bold text-red-800">Confirmar desinstallacio</h3>
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
                <p className="font-medium">Atencio!</p>
                <p className="text-sm">Aquesta accio eliminara el mode offline i no podras utilitzar l'aplicacio sense connexio a internet.</p>
              </div>
              
              {isMobile ? (
                <div className="relative h-12 bg-gray-100 rounded-lg mt-3 overflow-hidden">
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
              ) : (
                <div className="text-center my-4" />
              )}
            </div>
            
            <div className="flex gap-3 justify-between">
              <button
                onClick={handleCloseModal}
                className="py-2 px-5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-300 focus:outline-none"
              >
                Cancelar
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
                    <span>Confirmar</span>
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
