import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, CircleAlert, Download, RefreshCw, Timer, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { SwipeToConfirm } from './SwipeToConfirm';

export function OfflineButton() {
  // Core states - Initialize from localStorage to prevent flickering
  const [isInstalled, setIsInstalled] = useState(() => 
    localStorage.getItem('offlineModeEnabled') === 'true'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [cachingProgress, setCachingProgress] = useState(0);
  const [installationError, setInstallationError] = useState<string | null>(null);
  
  // UI states
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [swipeComplete, setSwipeComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isExitingModal, setIsExitingModal] = useState(false);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      if (isInstalling) {
        handleInstallationFailure("Connexió perduda");
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalling]);
  
  // Listen to service worker messages via custom events
  useEffect(() => {
    const handleSWMessage = (e: Event) => {
      const event = e as CustomEvent;
      const { type, progress, error, exists, itemCount } = event.detail;
      
      console.log('[v0] SW event:', type);
      
      switch (type) {
        case 'OFFLINE_READY':
        case 'CACHE_ALL_COMPLETE':
          setIsInstalled(true);
          setIsInstalling(false);
          setCachingProgress(100);
          break;
          
        case 'CACHE_STATUS':
          const hasValidCache = exists && itemCount > 5;
          setIsInstalled(hasValidCache);
          break;
          
        case 'CACHING_PROGRESS':
          setCachingProgress(Math.floor(progress || 0));
          break;
          
        case 'CACHE_ALL_FAILED':
          handleInstallationFailure(error || 'Installation failed');
          break;
      }
    };
    
    window.addEventListener('sw-message', handleSWMessage);
    
    // Verify installation status on mount if flag is set
    if (localStorage.getItem('offlineModeEnabled') === 'true' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CHECK_CACHE_STATUS' });
        }
      }).catch(() => {
        // If SW not ready despite flag, mark as not installed
        setIsInstalled(false);
        localStorage.removeItem('offlineModeEnabled');
      });
    }
    
    return () => {
      window.removeEventListener('sw-message', handleSWMessage);
    };
  }, []);
  

  
  const installServiceWorker = async () => {
    if (isOffline || isInstalling || !navigator.onLine) return;
    
    if (!('serviceWorker' in navigator)) {
      handleInstallationFailure('El teu navegador no suporta el mode offline');
      return;
    }
    
    setIsInstalling(true);
    setInstallationError(null);
    setCachingProgress(0);
    
    console.log('[v0] Starting installation...');
    
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/serviceWorker.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[v0] SW registered');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Ensure we have a controller
      if (!navigator.serviceWorker.controller) {
        // Reload to get SW control
        window.location.reload();
        return;
      }
      
      // Tell SW to cache everything
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_ALL' });
      
      // Set timeout for installation
      setTimeout(() => {
        if (isInstalling) {
          handleInstallationFailure('La instal·lació ha excedit el temps d\'espera');
        }
      }, 60000);
      
    } catch (error) {
      console.error('[v0] Installation failed:', error);
      handleInstallationFailure(error instanceof Error ? error.message : 'Error desconegut');
    }
  };
  
  const handleInstallationFailure = (errorMessage: string) => {
    console.error('[v0] Installation failed:', errorMessage);
    setIsInstalling(false);
    setCachingProgress(0);
    setInstallationError(errorMessage || 'Error durant la instal·lació');
  };
  
  const uninstallOfflineMode = async () => {
    if (!swipeComplete) return;
    
    console.log('[v0] Uninstalling...');
    setShowUninstallConfirm(false);
    resetSwipeState();
    
    try {
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Remove offline flag
      localStorage.removeItem('offlineModeEnabled');
      setIsInstalled(false);
      
      console.log('[v0] Uninstall complete');
    } catch (error) {
      console.error('[v0] Uninstall failed:', error);
    }
  };
  
  const handleSwipeComplete = () => setSwipeComplete(true);
  
  const resetSwipeState = () => {
    setSwipeComplete(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };
  
  const handleCloseModal = () => {
    setIsExitingModal(true);
    setTimeout(() => {
      setIsExitingModal(false);
      setShowUninstallConfirm(false);
      resetSwipeState();
    }, 200);
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
    const updateMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);
  
  // Handle countdown timer for desktop - auto-enable after 3 seconds
  useEffect(() => {
    if (showUninstallConfirm && !isMobile) {
      setSwipeComplete(false);
      countdownRef.current = setTimeout(() => {
        setSwipeComplete(true);
      }, 3000);
    }
    
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
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
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isInstalling ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                  <span className="font-medium">
                    {isInstalling
                      ? (cachingProgress >= 95 ? "Finalitzant..." : "Instal·lant...")
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
                    <span>Espera...</span>
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
