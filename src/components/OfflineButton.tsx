import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, CircleAlert, Download, RefreshCw, Timer, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { SwipeToConfirm } from './SwipeToConfirm';

export function OfflineButton() {
  const [isInstalled, setIsInstalled] = useState(false);
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
  
  // Monitor online/offline status with debounce to prevent flickering
  useEffect(() => {
    let networkStatusTimeout: NodeJS.Timeout | null = null;
    
    const handleOnlineStatus = () => {
      // Clear any existing timeout to prevent rapid state changes
      if (networkStatusTimeout) {
        clearTimeout(networkStatusTimeout);
      }
      
      // Debounce network status changes to prevent UI flickering
      networkStatusTimeout = setTimeout(() => {
        const isCurrentlyOffline = !navigator.onLine;
        setIsOffline(isCurrentlyOffline);
        
        // Notify service worker about connectivity status
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CONNECTIVITY_CHANGE',
            offlineMode: isCurrentlyOffline
          });
        }
        
        // If we go offline during installation, abort the process
        if (isCurrentlyOffline && isInstalling) {
          handleInstallationFailure("Connexió perduda. La instal·lació s'ha cancel·lat.");
        }
      }, 300);
    };
    
    // Check initial status
    setIsOffline(!navigator.onLine);
    
    // Listen for app updates needed
    const handleUpdateNeeded = (event: CustomEvent) => {
      console.log('Update needed event received:', event.detail);
      if (!isInstalling) {
        setUpdateAvailable(true);
        
        // Log the reason for the update requirement
        if (event.detail.reason) {
          console.log('Update reason:', event.detail.reason);
          
          // If there are missing files, log them
          if (event.detail.missingFiles && event.detail.missingFiles.length > 0) {
            console.log('Missing critical files:', event.detail.missingFiles);
          }
          
          // If there's a cache integrity issue
          if (event.detail.cacheIntegrity === 'invalid') {
            console.log('Cache integrity check failed');
          }
        }
      }
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    window.addEventListener('app-update-needed', handleUpdateNeeded as EventListener);
    
    return () => {
      if (networkStatusTimeout) {
        clearTimeout(networkStatusTimeout);
      }
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      window.removeEventListener('app-update-needed', handleUpdateNeeded as EventListener);
    };
  }, [isInstalling]);
  
  // Check if app is already installed/cached on component mount
  useEffect(() => {
    // Listen for service worker messages with minimal throttling for smooth updates
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THROTTLE = 50; // ms between updates (0.05s)
    let lastProgressValue = 0; // Track last progress value to ensure all steps are shown
    let stateChangeTimeout: NodeJS.Timeout | null = null; // Debounce state changes
    let installationCheckTimeout: NodeJS.Timeout | null = null;
    
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;
      
      console.log('Received message from Service Worker:', event.data);
      
      if (event.data.type === 'OFFLINE_READY' || event.data.type === 'CACHE_ALL_COMPLETE') {
        // Debounce the installed state change to avoid flickering
        if (stateChangeTimeout) clearTimeout(stateChangeTimeout);
        stateChangeTimeout = setTimeout(() => {
          setIsInstalled(true);
          setIsInstalling(false);
          setUpdateAvailable(false);
          localStorage.setItem('offlineModeEnabled', 'true');
          setCachingProgress(100);
          console.log('[v0] App installation confirmed and completed');
        }, 100);
        
        // Remove updating toast if it exists
        const updatingToast = document.getElementById('updating-toast');
        if (updatingToast) {
          document.body.removeChild(updatingToast);
        }
        
        // If this was an auto update, just reset state
        if (event.data.isAutoUpdate) {
          // Reset installation/update state
          setIsInstalling(false);
        }
      } else if (event.data.type === 'CACHE_STATUS') {
        // Update installed state based on cache status
        const hasCache = event.data.exists && event.data.itemCount > 5;
        console.log('[v0] Cache status confirmed:', { exists: event.data.exists, itemCount: event.data.itemCount, hasCache });
        
        // Sync with localStorage
        if (hasCache) {
          setIsInstalled(true);
          localStorage.setItem('offlineModeEnabled', 'true');
        } else {
          setIsInstalled(false);
          localStorage.removeItem('offlineModeEnabled');
        }
      } else if (event.data.type === 'CACHE_ALL_FAILED') {
        handleInstallationFailure(event.data.error || 'Unknown error');
      } else if (event.data.type === 'CACHING_PROGRESS') {
        // Minimal throttling for smooth updates
        const now = Date.now();
        const progressValue = Math.floor(event.data.progress);
        
        // Always update if:
        // 1. Sufficient time has passed since last update
        // 2. We're approaching completion
        // 3. The progress value has increased by at least 5 since last update
        // 4. We've reached a new progress "step" (like 55, 60, 65)
        if (now - lastProgressUpdate > PROGRESS_UPDATE_THROTTLE || 
            event.data.progress >= 99 || 
            (progressValue - lastProgressValue >= 5) ||
            ([55, 60, 65, 70, 75, 80, 85, 90, 95].includes(progressValue) && progressValue > lastProgressValue)) {
          
          lastProgressUpdate = now;
          lastProgressValue = progressValue;
          
          // Update progress state with actual percentage
          setCachingProgress(progressValue);
          
          console.log(`[v0] UI Progress updated: ${progressValue}%`);
          
          // If an update is in progress but isInstalling isn't set, set it now
          if (event.data.isAutoUpdate && !isInstalling) {
            setIsInstalling(true);
            setUpdateAvailable(true);
          }
        }
      } else if (event.data.type === 'VERSION_INFO') {
        // Version info received - check if update needed
        const newVersion = event.data.version;
        const storedVersion = localStorage.getItem('appVersion');
        
        console.log(`[v0] Version check in component: Current=${newVersion}, Stored=${storedVersion}`);
        
        if (storedVersion && storedVersion !== newVersion) {
          setUpdateAvailable(true);
        }
      } else if (event.data.type === 'UPDATE_LABEL_SET') {
        // Update label received from service worker
        console.log('[v0] Update label received:', event.data.label);
        // Here we could store the label if needed for UI customization
      }
    };
    
    const performInitialCheck = () => {
      console.log('[v0] Performing initial installation check...');
      
      // Check localStorage flag first
      const offlineModeEnabled = localStorage.getItem('offlineModeEnabled') === 'true';
      console.log('[v0] offlineModeEnabled in localStorage:', offlineModeEnabled);
      
      // Check if service worker is active/controlling
      const hasController = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
      console.log('[v0] Has active service worker controller:', hasController);
      
      // If both conditions are true, app is installed
      if (offlineModeEnabled && hasController) {
        console.log('[v0] ✓ App is installed (offline mode enabled + active SW)');
        setIsInstalled(true);
      } else if (offlineModeEnabled && !hasController) {
        // Offline mode was enabled but no controller - verify with service worker
        console.log('[v0] Offline mode enabled but no controller, requesting cache status verification');
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_CACHE_STATUS'
          });
        }
      } else {
        console.log('[v0] App is not installed');
        setIsInstalled(false);
      }
      
      // In all cases where offline mode was enabled, ensure service worker ready is available
      if (offlineModeEnabled && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(() => {
            console.log('[v0] Service worker is ready');
            // Request cache status for verification
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_CACHE_STATUS'
              });
            }
          })
          .catch((error) => {
            console.error('[v0] Service worker ready failed:', error);
          });
      }
    };
    
    // Wait a bit for service worker to be ready, then perform check
    installationCheckTimeout = setTimeout(() => {
      performInitialCheck();
    }, 500);
    
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      if (stateChangeTimeout) clearTimeout(stateChangeTimeout);
      if (installationCheckTimeout) clearTimeout(installationCheckTimeout);
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);
  

  
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
          
          if (!isInstalled && isInstalling) {
            // Check if we're still online
            if (!navigator.onLine) {
              handleInstallationFailure('Problema de xarxa, torna-ho a intentar');
              return;
            }
            
            // Mark as complete - we'll let the service worker handle the actual final percentage
            console.log('Cache timeout reached, considering installation complete');
            setIsInstalled(true);
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
      
      // Reset component state
      setIsInstalled(false);
      
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
                isOffline 
                  ? isInstalled
                    ? 'bg-amber-100 text-amber-700' // Yellow: Offline + Downloaded
                    : 'bg-red-100 text-red-700'     // Red: Offline + Not Downloaded
                  : isInstalled 
                    ? 'bg-green-100 text-green-700' // Green: Online + Downloaded
                    : 'bg-blue-100 text-blue-700'   // Blue: Online + Not Downloaded
              }`}>
                {isOffline ? (
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
              {isInstalled && !isInstalling ? (
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
