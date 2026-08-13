// Bump on every change to index.html, the manifest or the fonts it references —
// the activate handler drops caches whose name no longer matches, so installed
// PWAs keep serving the old shell until this version changes.
const CACHE_NAME = 'caobapos-pwa-v3';
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

// Install Event - Pre-cache core files with individual asset fallbacks
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Pre-cacheando activos estáticos del Service Worker...');
        const cachePromises = ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`⚠️ No se pudo pre-cachear el recurso: ${url}`, err);
          });
        });
        return Promise.all(cachePromises);
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

  // 1. Navegación SPA: Network-First con fallback de caché y página offline amigable
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', responseToCache));
          }
          return networkResponse;
        })
        .catch(err => {
          console.warn('⚠️ Navegación de red falló. Intentando responder con caché de index.html...', err);
          return caches.match('/index.html').then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Respuesta HTML de emergencia si no hay red ni caché
            return new Response(
              `<!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sin Conexión - CaobaPOS</title>
                <style>
                  body {
                    background: #120e0c;
                    color: #f7f3f0;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                    padding: 20px;
                    box-sizing: border-box;
                  }
                  .container {
                    max-width: 400px;
                  }
                  h1 { color: #d4a373; font-size: 1.8rem; margin-bottom: 10px; }
                  p { color: #a89f98; font-size: 1rem; line-height: 1.5; margin-bottom: 20px; }
                  .btn {
                    background: #d4a373;
                    color: #120e0c;
                    border: none;
                    padding: 10px 20px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                  }
                  .btn:hover { background: #e6b88a; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Estás sin conexión</h1>
                  <p>CaobaPOS no pudo conectarse al servidor y no hay una copia local guardada aún en este navegador.</p>
                  <button class="btn" onclick="window.location.reload()">Reintentar</button>
                </div>
              </body>
              </html>`,
              {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              }
            );
          });
        })
    );
    return;
  }

  // 2. Activos locales estáticos - Cache-First con fallback a Response 503 seguro
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
          // Retornar un Response de error de red normal para que el navegador no lance ERR_FAILED
          return new Response('Activo estático no disponible sin conexión', {
            status: 503,
            statusText: 'Service Unavailable'
          });
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
