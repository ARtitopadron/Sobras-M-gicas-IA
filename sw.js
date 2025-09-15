// sw.js - Service Worker for Sobras Mágicas IA (v7 - Foolproof Stale-While-Revalidate)

const CACHE_NAME = 'sobras-magicas-cache-v7';

// 1. Evento de instalación: No hacer precaching para evitar fallos.
self.addEventListener('install', event => {
  console.log('[Service Worker] Install Event: New version installed.');
  // Forzamos al nuevo SW a activarse inmediatamente en lugar de esperar a que el usuario cierre todas las pestañas.
  event.waitUntil(self.skipWaiting());
});

// 2. Evento de activación: Limpiar cachés antiguas.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate Event: Now ready to handle fetches!');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre del caché no es el actual, lo borramos.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Tomar control inmediato de las páginas abiertas.
  );
});

// 3. Evento fetch: Estrategia "Stale-While-Revalidate".
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignorar peticiones que no son GET y las de la API de Gemini.
  if (request.method !== 'GET' || request.url.includes('generativelanguage')) {
    // Dejar que el navegador las maneje por defecto.
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        // Hacemos la petición a la red en paralelo.
        const fetchPromise = fetch(request).then(networkResponse => {
          // Si la petición es exitosa, la guardamos en caché para el futuro.
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Si hay una respuesta en caché, la devolvemos inmediatamente.
        // Esto hace que la app se cargue muy rápido (stale).
        // Mientras tanto, la petición a la red (fetchPromise) se está ejecutando para actualizar la caché (revalidate).
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si no hay nada en caché, esperamos a que la red responda.
        return fetchPromise;
      });
    }).catch(error => {
      // Manejo de errores en caso de que todo falle (e.g., caches.open).
      console.error('[Service Worker] Fetch failed:', error);
      // Intentar responder desde la red como último recurso.
      return fetch(request);
    })
  );
});