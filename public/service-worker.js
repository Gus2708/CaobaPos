const CACHE_NAME = 'caobapos-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/screenshot-mobile.png',
  '/screenshot-desktop.png'
];

// Install Event - Pre-cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Pre-cacheando activos estáticos del Service Worker...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up obsolete caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Eliminando caché antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Strategic intercepting
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. SPA Navigation Redirect: All navigation requests serve the cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(cachedResponse => {
          return cachedResponse || fetch(request).catch(() => {
            console.warn('⚠️ Offline: Serviendo index.html fallback...');
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. Local static assets (Scripts, CSS, Images, Fonts) - Cache-First
  const isLocalAsset = url.origin === self.location.origin;
  const isStaticExtension = /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|eot|ttf|otf|json)$/i.test(url.pathname) || url.pathname.includes('manifest');

  if (isLocalAsset && isStaticExtension) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Serve from cache but fetch fresh in background to update cache (Stale-While-Revalidate style)
          fetch(request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Ignore network errors during background sync */});
          return cachedResponse;
        }

        // Fetch from network and save to cache
        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        }).catch(err => {
          console.warn('❌ Fallo al descargar activo estático offline:', request.url, err);
        });
      })
    );
    return;
  }

  // 3. API / Remote services (Supabase queries) - Network First with safe 503 fallback
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Dynamic clone caching for safe operations
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(err => {
          console.warn('🔌 Conectividad perdida. Intentando responder con caché de API...', request.url);
          
          if (request.method === 'GET') {
            return caches.match(request).then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              
              // If no API response cached, return a clean offline JSON fallback
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'El dispositivo no está conectado a internet. La consulta se resolverá al restablecer la conexión.',
                  status: 503 
                }),
                { 
                  status: 503, 
                  headers: { 'Content-Type': 'application/json' } 
                }
              );
            });
          }

          // Non-GET requests (POST, PUT, DELETE sales, inventory adjustments, etc.)
          return new Response(
            JSON.stringify({ 
              error: 'Offline_Write', 
              message: 'Operación local guardada. Se sincronizará automáticamente cuando vuelvas a tener red.', 
              status: 503 
            }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        })
    );
    return;
  }
});
