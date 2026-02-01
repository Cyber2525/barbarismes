// Service Worker for Mots Correctes comprehensive offline functionality
const CACHE_NAME = 'mots-correctes-cache-v4';
const APP_VERSION = '1.0.0'; // App version for update checking

// URLs to cache during installation - comprehensive list with wildcards
const urlsToCache = [
  '/', 
  '/index.html',
  '/manifest.json',
  // Cache all static assets - use wildcards for versioned files
  '/assets/index-*.js',
  '/assets/index-*.css',
  // Fonts
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/*',
  // Icons and images (from CDN)
  'https://mocha-cdn.com/favicon.ico',
  'https://mocha-cdn.com/apple-touch-icon.png',
  'https://mocha-cdn.com/og.png',
  // Ensure we also cache the quiz data by fetching the main app
  '/src/data/quizData.ts',
  // Cache any other key app resources
  '/src/App.tsx',
  '/src/main.tsx',
  '/src/index.css'
];

// Additional assets to cache for comprehensive offline experience
const additionalAssets = [
  // Add all components by pattern
  '/src/components/*.tsx',
  // Add all data/types
  '/src/types/*.ts'
];

// Install event - cache all initial resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  // Force new service worker to activate immediately
  self.skipWaiting();
  
  // We'll do minimal caching on install to speed up installation process
  // Full caching will be done when user explicitly requests it
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Initial caching of app shell');
        return cache.addAll(['/', '/index.html', '/manifest.json'])
          .then(() => {
            console.log('Service Worker: Basic app shell cached');
          })
          .catch(error => {
            console.error('Initial caching failed:', error);
          });
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  const cacheAllowlist = [CACHE_NAME];
  
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheAllowlist.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of uncontrolled clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Now controlling all clients');
    })
  );
});

// Fetch event - network-first when online, cache-first when offline strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') && 
      !event.request.url.includes('fonts.gstatic.com') &&
      !event.request.url.includes('mocha-cdn.com')) {
    return;
  }
  
  // For HTML navigations, always try network first, falling back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Service Worker: Serving cached page on network failure');
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Implement dynamic caching strategy based on online status
  const networkFirst = () => {
    return fetch(event.request.clone())
      .then(networkResponse => {
        if (networkResponse.ok) {
          // Cache the fresh response for offline use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, networkResponse.clone());
              console.log('Service Worker: Network response cached for:', event.request.url);
            });
          return networkResponse;
        } else {
          // If network response isn't valid, try cache
          return caches.match(event.request);
        }
      })
      .catch(error => {
        console.log('Service Worker: Network fetch failed, using cache:', error);
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // No cache hit and network failed for HTML, return the main page
            if (event.request.headers.get('accept') && 
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // For non-HTML resources, we don't have a general fallback
            return new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      });
  };
  
  const cacheFirst = () => {
    return caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache (offline mode):', event.request.url);
          return cachedResponse;
        }
        
        // Even when offline, try network as last resort
        return fetch(event.request.clone())
          .catch(error => {
            console.log('Service Worker: Offline and no cache for:', event.request.url);
            
            // For HTML requests, return the main page
            if (event.request.headers.get('accept') && 
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      });
  };
  
  // Check for isOnline message from clients
  // Default to network-first when we're not sure
  const clientId = event.clientId;
  const isOfflineMode = self.offlineMode === true;
  
  // If we know we're offline or the client has explicitly requested offline mode
  if (isOfflineMode) {
    console.log('Service Worker: Using cache-first strategy (offline mode)');
    event.respondWith(cacheFirst());
  } else {
    // Default to network-first when online or unsure
    console.log('Service Worker: Using network-first strategy (online mode)');
    event.respondWith(networkFirst());
  }
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Received message', event.data);
  
  if (!event.data) {
    return;
  }
  
  // Store update label if provided
  if (event.data.updateLabel) {
    self.updateLabel = event.data.updateLabel;
    console.log(`Service Worker: Using update label "${self.updateLabel}"`);
  }
  
  // Set offline mode flag
  if (event.data.offlineMode !== undefined) {
    self.offlineMode = event.data.offlineMode;
    console.log(`Service Worker: Offline mode set to ${self.offlineMode}`);
  }
  
  // Handle version check request
  if (event.data.type === 'CHECK_VERSION') {
    console.log('Service Worker: Checking version');
    event.source.postMessage({
      type: 'VERSION_INFO',
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }
  
  // Handle version and cache integrity check
  if (event.data.type === 'CHECK_VERSION_AND_CACHE') {
    console.log('Service Worker: Checking version and cache integrity');
    const forceDeep = event.data.forceDeep === true;
    
    // First check if cache exists at all
    caches.has(CACHE_NAME).then(cacheExists => {
      if (!cacheExists) {
        // No cache exists - immediate update needed
        event.source.postMessage({
          type: 'CACHE_VALIDATION',
          version: APP_VERSION,
          cacheName: CACHE_NAME,
          cacheIntegrity: 'invalid',
          reason: 'Cache not found'
        });
        return;
      }
      
      // Check key app files to ensure they're properly cached
      caches.open(CACHE_NAME).then(cache => {
        // Define critical files that must be present
        const criticalFiles = [
          '/',
          '/index.html',
          '/manifest.json'
        ];
        
        // Add more files for deep validation
        const deepValidationFiles = [
          '/assets/index-*.js',
          '/assets/index-*.css',
          'https://mocha-cdn.com/favicon.ico',
          'https://mocha-cdn.com/apple-touch-icon.png'
        ];
        
        // Use regex matching for wildcard paths
        const matchFileInCache = async (wildcardPath, cache) => {
          const keys = await cache.keys();
          const pattern = wildcardPath.replace('*', '.*');
          const regex = new RegExp(pattern);
          
          // Check if any cached file matches the pattern
          const matches = keys.filter(key => regex.test(key.url));
          return {
            url: wildcardPath,
            exists: matches.length > 0
          };
        };
        
        // Check files based on validation depth
        const filesToCheck = forceDeep 
          ? [...criticalFiles, ...deepValidationFiles]
          : criticalFiles;
        
        // Process all files to check
        Promise.all(
          filesToCheck.map(url => {
            if (url.includes('*')) {
              return matchFileInCache(url, cache);
            } else {
              return cache.match(url).then(response => ({
                url,
                exists: !!response
              }));
            }
          })
        ).then(results => {
          // Find any missing files
          const missingFiles = results.filter(result => !result.exists).map(result => result.url);
          
          // Get total cache size for validation
          cache.keys().then(keys => {
            // Expected item count (higher for deep validation)
            const expectedMinItems = forceDeep ? 8 : 3;
            const hasEnoughItems = keys.length >= expectedMinItems;
            
            const cacheStatus = {
              type: 'CACHE_VALIDATION',
              version: APP_VERSION,
              cacheName: CACHE_NAME,
              cacheIntegrity: missingFiles.length > 0 || !hasEnoughItems ? 'invalid' : 'valid',
              missingFiles: missingFiles,
              itemCount: keys.length,
              expectedMinItems: expectedMinItems,
              reason: missingFiles.length > 0 
                ? 'Missing critical files' 
                : !hasEnoughItems 
                  ? 'Insufficient cache items' 
                  : null
            };
            
            console.log('Cache validation result:', cacheStatus);
            event.source.postMessage(cacheStatus);
          });
        });
      });
    });
  }
  
  // Handle connectivity change
  if (event.data.type === 'CONNECTIVITY_CHANGE') {
    self.offlineMode = event.data.offlineMode === true;
    console.log(`Service Worker: Setting offline mode to ${self.offlineMode}`);
    
    // Notify all clients about the change
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CONNECTIVITY_STATUS_UPDATED',
          offlineMode: self.offlineMode
        });
      });
    });
  }
  
  // Cache specific URL
  if (event.data.type === 'CACHE_URL') {
    caches.open(CACHE_NAME)
      .then(cache => {
        // Use network fetch with no-cache option to ensure fresh content
        const fetchOptions = {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        };
        
        fetch(event.data.url, fetchOptions)
          .then(response => {
            if (response.ok) {
              return cache.put(event.data.url, response);
            } else {
              throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }
          })
          .then(() => {
            console.log('Service Worker: Added to cache:', event.data.url);
            // Notify the client that requested the cache
            event.source.postMessage({
              type: 'CACHE_COMPLETE',
              url: event.data.url
            });
          })
          .catch(error => {
            console.error('Service Worker: Failed to cache URL:', error);
            event.source.postMessage({
              type: 'CACHE_FAILED',
              url: event.data.url,
              error: error.message || 'Unknown error'
            });
          });
      });
  }
  
  // Cache all app resources
  if (event.data.type === 'CACHE_ALL') {
    console.log('Service Worker: Starting comprehensive caching...');
    const isAutoUpdate = event.data.isAutoUpdate === true;
    const forceRevalidate = event.data.forceRevalidate === true;
    
    // Progress tracking variables
    let totalItems = 0;
    let downloadedItems = 0;
    let lastProgressUpdate = 0;
    
    // Predefined progress steps for consistent visualization
    const progressSteps = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    
    // Ensure network-first mode during caching
    self.offlineMode = false;
    
    // Function to update download progress percentage with throttling
    const updateDownloadProgress = (completed) => {
      const now = Date.now();
      // Throttle updates to every 50ms for smooth UI without overwhelming
      if (now - lastProgressUpdate < 50 && completed < totalItems - 1) return;
      
      lastProgressUpdate = now;
      downloadedItems = completed;
      
      // Calculate raw percentage
      const rawPercentage = (downloadedItems / totalItems) * 100;
      
      // Map to nearest predefined step
      const percentage = progressSteps.reduce((prev, curr) => 
        Math.abs(curr - rawPercentage) < Math.abs(prev - rawPercentage) ? curr : prev
      );
      
      // Send progress update to client
      event.source.postMessage({
        type: 'CACHING_PROGRESS',
        progress: percentage,
        message: percentage >= 95 ? 'Finalitzant...' : 'Descarregant recursos...',
        isAutoUpdate: isAutoUpdate
      });
      
      console.log(`Progress: ${percentage}% (${downloadedItems}/${totalItems} items)`);
    };
    
    // First, notify that we're starting the process
    event.source.postMessage({
      type: 'CACHING_PROGRESS',
      progress: 0,
      message: 'Iniciando descàrrega...',
      isAutoUpdate: isAutoUpdate
    });
    
    // Resolve wildcards into actual URLs we can cache
    const resolveWildcardUrls = async () => {
      // First get the HTML page to find assets
      const response = await fetch('/');
      const html = await response.text();
      
      // Extract JS and CSS links from HTML
      const jsFiles = Array.from(html.matchAll(/src="([^"]+\.js)"/g)).map(m => m[1]);
      const cssFiles = Array.from(html.matchAll(/href="([^"]+\.css)"/g)).map(m => m[1]);
      
      // Get app assets
      let assets = [...jsFiles, ...cssFiles];
      
      // Remove duplicates and filter out external URLs
      assets = Array.from(new Set(assets)).filter(url => 
        url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
      );
      
      console.log('Resolved assets to cache:', assets);
      return assets;
    };
    
    // Main caching process
    caches.open(CACHE_NAME)
      .then(async cache => {
        try {
          // Get actual URLs for app assets
          const appAssets = await resolveWildcardUrls();
          
          // Calculate total items to cache for accurate progress tracking
          const coreResources = [
            '/',
            '/index.html', 
            '/manifest.json'
          ];
          
          // External resources (fonts, images) to cache
          const externalResources = [
            'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
            'https://mocha-cdn.com/favicon.ico',
            'https://mocha-cdn.com/apple-touch-icon.png',
            'https://mocha-cdn.com/og.png'
          ];
          
          // Calculate total items for accurate progress tracking
          totalItems = coreResources.length + appAssets.length + externalResources.length + 3; // +3 for verification steps
          console.log(`Total items to cache: ${totalItems}`);
          
          // Update progress to show we've begun
          updateDownloadProgress(0);
          
          // Cache core resources with progress tracking
          for (let i = 0; i < coreResources.length; i++) {
            try {
              await cache.add(coreResources[i]);
              updateDownloadProgress(i + 1);
            } catch (error) {
              console.error(`Failed to cache ${coreResources[i]}:`, error);
            }
          }
          
          // Cache app assets (JS/CSS files) - always fetch fresh versions
          for (let i = 0; i < appAssets.length; i++) {
            try {
              // Use no-cache to ensure fresh content
              const fetchOptions = {
                cache: 'no-cache',
                headers: {
                  'Cache-Control': 'no-cache'
                }
              };
              
              const response = await fetch(appAssets[i], fetchOptions);
              if (response.ok) {
                await cache.put(appAssets[i], response);
                updateDownloadProgress(coreResources.length + i + 1);
                // Add a small delay to ensure progress visualization shows all steps
                if (i % 3 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              } else {
                throw new Error(`Failed fetch: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error(`Failed to cache ${appAssets[i]}:`, error);
            }
          }
          
          // Cache external resources (fonts, images) - always fetch fresh versions
          for (let i = 0; i < externalResources.length; i++) {
            try {
              // Use no-cache to ensure fresh content
              const fetchOptions = {
                cache: 'no-cache',
                headers: {
                  'Cache-Control': 'no-cache'
                }
              };
              
              const response = await fetch(externalResources[i], fetchOptions);
              if (response.ok) {
                await cache.put(externalResources[i], response);
                updateDownloadProgress(coreResources.length + appAssets.length + i + 1);
                // Add a small delay to ensure progress visualization shows all steps
                if (externalResources.length > 2 && i < externalResources.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } else {
                throw new Error(`Failed fetch: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error(`Failed to cache ${externalResources[i]}:`, error);
            }
          }
          
          // Verification stages with real progress updates
          for (let i = 1; i <= 3; i++) {
            updateDownloadProgress(totalItems - (4-i));
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Final update to 100%
          updateDownloadProgress(totalItems);
          
          // Wait a moment and notify of completion
          setTimeout(() => {
            console.log('Service Worker: All resources cached successfully');
            event.source.postMessage({
              type: 'CACHE_ALL_COMPLETE',
              message: 'App is ready for offline use!',
              version: APP_VERSION,
              cacheName: CACHE_NAME,
              isAutoUpdate: isAutoUpdate
            });
            
            // Also notify all clients
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({
                type: 'OFFLINE_READY',
                message: 'App is ready for offline use!',
                version: APP_VERSION,
                cacheName: CACHE_NAME
              }));
            });
          }, 1000);
        } catch (error) {
          console.error('Service Worker: Failed to cache all resources:', error);
          event.source.postMessage({
            type: 'CACHE_ALL_FAILED',
            error: error.message || 'Unknown error during caching'
          });
        }
      });
  }
  
  // Check cache status
  if (event.data.type === 'CHECK_CACHE_STATUS') {
    caches.has(CACHE_NAME)
      .then(async hasCache => {
        if (hasCache) {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const itemCount = keys.length;
          
          // Verify critical files exist
          const criticalUrls = ['/', '/index.html', '/manifest.json'];
          const cachedPaths = keys.map(req => new URL(req.url).pathname);
          const hasCriticalFiles = criticalUrls.every(url => 
            cachedPaths.includes(url) || cachedPaths.some(p => p.endsWith(url))
          );
          
          // Valid if we have 3+ items AND critical files
          const isValid = itemCount >= 3 && hasCriticalFiles;
          
          console.log(`Cache status: ${itemCount} items, critical files: ${hasCriticalFiles}, valid: ${isValid}`);
          
          event.source.postMessage({
            type: 'CACHE_STATUS',
            exists: true,
            itemCount: itemCount,
            hasCriticalFiles: hasCriticalFiles,
            isValid: isValid
          });
        } else {
          console.log('Cache does not exist');
          event.source.postMessage({
            type: 'CACHE_STATUS',
            exists: false,
            itemCount: 0,
            hasCriticalFiles: false,
            isValid: false
          });
        }
      })
      .catch(error => {
        console.error('Error checking cache status:', error);
        event.source.postMessage({
          type: 'CACHE_STATUS',
          exists: false,
          itemCount: 0,
          hasCriticalFiles: false,
          isValid: false,
          error: error.message
        });
      });
  }
  
  // Handle SKIP_WAITING message
  if (event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  // Handle CLAIM_CLIENTS message
  if (event.data.type === 'CLAIM_CLIENTS') {
    console.log('Service Worker: Received CLAIM_CLIENTS message');
    self.clients.claim();
  }
});
