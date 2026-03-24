/* eslint-disable no-undef */

/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications. The Firebase config is sent
 * from the main app via postMessage after the SW is registered.
 *
 * Using compat v10.14.1 (last stable compat release that works with all browsers).
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

let messagingInitialized = false;

/**
 * Initialize Firebase when the main app sends the config.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !messagingInitialized) {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();
    messagingInitialized = true;

    messaging.onBackgroundMessage((payload) => {
      var notificationData = payload.notification || {};
      var data = payload.data || {};
      var title = notificationData.title || data.title;
      var body = notificationData.body || data.body;

      if (!title) return;

      var tag = data.notificationId || data.category || 'default';

      self.registration.showNotification(title, {
        body: body || '',
        icon: notificationData.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: tag,
        renotify: true,
        data: data,
        vibrate: [200, 100, 200],
      });
    });
  }
});

/**
 * Resolve the URL a notification click should navigate to.
 */
function resolveClickUrl(data) {
  if (!data) return '/dashboard';

  if (data.action === 'payment_verified' || data.action === 'payment_rejected') {
    return data.paymentId ? '/dashboard/payments/' + data.paymentId : '/dashboard/payments';
  }
  if (data.action === 'ticket_resolved' || data.action === 'ticket_closed' || data.action === 'ticket_reply') {
    return data.ticketId ? '/dashboard/support/' + data.ticketId : '/dashboard/support';
  }
  if (data.action === 'quota_generated' || data.action === 'quota_reminder') {
    return data.quotaId ? '/dashboard/quotas/' + data.quotaId : '/dashboard/quotas';
  }

  if (data.category === 'payment') return '/dashboard/payments';
  if (data.category === 'quota') return '/dashboard/quotas';
  if (data.category === 'announcement') return '/dashboard/announcements';
  if (data.category === 'alert' || data.category === 'system') return '/dashboard/notifications';

  if (data.url) return data.url;

  return '/dashboard';
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  var url = resolveClickUrl(event.notification.data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
