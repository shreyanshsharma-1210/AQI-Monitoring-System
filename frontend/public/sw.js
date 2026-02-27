/**
 * AQI Monitor — Service Worker for Web Push notifications (VAPID).
 * Registered from AlertSettings.jsx via navigator.serviceWorker.register('/sw.js').
 *
 * Events handled:
 *   push          — shows a browser notification when a push payload arrives
 *   notificationclick — opens the app (or the URL in the payload) when the user taps the notification
 */

// ── Push received ──────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'AQI Alert', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'AQI Monitor';
  const options = {
    body:    data.body  || 'Air quality update',
    icon:    '/favicon.ico',
    badge:   '/favicon.ico',
    tag:     'aqi-alert',          // collapse multiple rapid alerts into one
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open',    title: 'View dashboard' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});


// ── Notification click ─────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if one is open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


// ── Activate: take control immediately ────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
