// Service Worker for PWA - Offline Support
/* eslint-disable no-restricted-globals */

// ✅ FIX: Update cache version to force cache refresh when code changes
// Increment version number when deploying new code
const CACHE_VERSION = '2'; // Update this when deploying new version
const CACHE_NAME = `kasir-pos-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `kasir-pos-runtime-v${CACHE_VERSION}`;

// ✅ FIX: Only cache essential static assets that don't change
// Don't cache JS/CSS with hashed names - they'll be cached at runtime
const STATIC_ASSETS = ['/', '/manifest.json', '/logo-qk.png'];

// Install event - Cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching static assets');
      // ✅ FIX: Cache only essential assets, ignore failures for optional ones
      return cache.addAll(STATIC_ASSETS).catch(error => {
        console.warn('[Service Worker] Failed to cache some assets:', error);
        // Don't fail installation if some assets fail to cache
        return Promise.resolve();
      });
    })
  );

  // Activate immediately
  self.skipWaiting();

  // Listen for skip waiting message from client
  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
});

// Activate event - Clean old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // ✅ FIX: Delete all old caches (any version that's not current)
            if (
              !cacheName.startsWith(`kasir-pos-v${CACHE_VERSION}`) &&
              !cacheName.startsWith(`kasir-pos-runtime-v${CACHE_VERSION}`)
            ) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // ✅ FIX: Take control immediately and notify all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // ✅ OPTIMIZATION: Cache API GET responses for better performance
  // Cache strategy: Network first, fallback to cache (stale-while-revalidate)
  if (url.pathname.startsWith('/api/') && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);

          // Clone response untuk cache (response hanya bisa dibaca sekali)
          const responseClone = networkResponse.clone();

          // Cache successful responses (status 200-299)
          if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            // Cache dengan TTL 5 menit untuk API responses
            cache.put(request, responseClone).catch(() => {
              // Ignore cache errors
            });
          }

          return networkResponse;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // No cache, return error
          throw error;
        }
      })()
    );
    return;
  }

  // Skip chrome-extension and external APIs (non-origin)
  if (
    url.protocol === 'chrome-extension:' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone for cache and return
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline: Try to serve from cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to index.html for SPA
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Handle other requests (JS, CSS, images, etc.)
  // ✅ FIX: Use Cache First strategy for static assets (JS, CSS, images)
  // This handles hashed filenames automatically
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // ✅ OPTIMIZATION: Return cached version immediately, then update in background
        // This is "stale-while-revalidate" strategy for better performance
        fetch(request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
          })
          .catch(() => {
            // Network failed, keep using cache
          });

        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then(response => {
          // ✅ FIX: Only cache successful responses
          if (response.ok) {
            // Clone for cache and return
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, return offline fallback if available
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
          // For JS/CSS, try to serve index.html as fallback (SPA routing)
          if (
            request.destination === 'script' ||
            request.destination === 'style'
          ) {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Background sync (for offline transactions)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      // Trigger background sync in the app
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_TRANSACTIONS' });
        });
      })
    );
  }
});

// ✅ Push notifications - Handle incoming push messages
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');

  let notificationData = {
    title: 'Kasir POS',
    body: 'Anda memiliki notifikasi baru',
    icon: '/logo-qk.png',
    badge: '/logo-qk.png',
    tag: 'kasir-pos-notification',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Kasir POS',
        body: data.body || data.message || 'Anda memiliki notifikasi baru',
        icon: data.icon || '/logo-qk.png',
        badge: data.badge || '/logo-qk.png',
        tag: data.tag || 'kasir-pos-notification',
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        vibrate: data.vibrate || [200, 100, 200],
        actions: data.actions || [],
      };
    } catch (e) {
      // If not JSON, try text
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate,
    actions: notificationData.actions,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// ✅ Notification click - Handle when user clicks notification
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked', event.notification.data);

  event.notification.close();

  // ✅ FIX: Determine URL based on notification data (role-based routing)
  const notificationData = event.notification.data || {};
  let urlToOpen = '/';

  // Route based on notification type and resource
  if (notificationData.type === 'order.created' || notificationData.type === 'order.paid' || notificationData.type === 'order.status_changed') {
    // Order notifications - route based on user role
    if (notificationData.resource_type === 'order' && notificationData.resource_id) {
      // Kitchen role -> kitchen dashboard
      if (notificationData.meta?.role === 'kitchen' || notificationData.tag?.includes('kitchen')) {
        urlToOpen = '/kitchen';
      }
      // Waiter role -> waiter dashboard
      else if (notificationData.meta?.role === 'waiter' || notificationData.tag?.includes('waiter')) {
        urlToOpen = '/waiter';
      }
      // Kasir role -> POS
      else if (notificationData.meta?.role === 'kasir' || notificationData.tag?.includes('kasir')) {
        urlToOpen = '/pos';
      }
      // Owner/Admin -> orders list
      else {
        urlToOpen = '/orders';
      }
    }
  } else if (notificationData.type === 'subscription.expiring' || notificationData.type === 'subscription.expired') {
    urlToOpen = '/subscription-settings';
  } else if (notificationData.url) {
    urlToOpen = notificationData.url;
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window/tab open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          // Focus any open window (not just matching URL)
          if ('focus' in client) {
            return client.focus().then(() => {
              // Post message to navigate to the correct page
              client.postMessage({
                type: 'NAVIGATE',
                url: urlToOpen,
                notificationData: notificationData
              });
            });
          }
        }
        // If no window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ✅ Notification close - Handle when user closes notification
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notification closed', event.notification.tag);
  // Can send analytics or update UI here if needed
});

console.log('[Service Worker] Loaded');
