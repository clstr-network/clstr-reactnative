// Service Worker for Push Notifications
// This file MUST be served from the root of your domain

const CACHE_NAME = 'alumni-connect-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  let data = {
    title: 'AlumniConnect',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'default',
    data: {
      url: '/',
    },
  };

  // Parse the push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || payload.type || data.tag,
        data: {
          url: payload.url || payload.data?.url || '/',
          type: payload.type,
          relatedId: payload.related_id || payload.relatedId,
        },
      };
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
      // Use text if JSON parsing fails
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if a window/tab is already open at the target URL
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Navigate existing window to the URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: urlToOpen,
            data: event.notification.data,
          });
          return client.focus();
        }
      }

      // No matching window found - open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
