/* eslint-disable no-undef */

/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications. The Firebase config is sent
 * from the main app via postMessage after the SW is registered, and
 * cached using the Cache API so it survives SW restarts (common on mobile).
 *
 * Using compat v10.14.1 (last stable compat release that works with all browsers).
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

var messagingInitialized = false;
var CONFIG_CACHE_NAME = 'firebase-config-v1';
var CONFIG_CACHE_KEY = '/__firebase-config';

// ─── Config persistence via Cache API ────────────────────────────────────────

function saveConfigToCache(config) {
  return caches.open(CONFIG_CACHE_NAME).then(function (cache) {
    return cache.put(CONFIG_CACHE_KEY, new Response(JSON.stringify(config)));
  }).catch(function () {
    // Ignore cache write errors
  });
}

function loadConfigFromCache() {
  return caches.open(CONFIG_CACHE_NAME).then(function (cache) {
    return cache.match(CONFIG_CACHE_KEY);
  }).then(function (response) {
    if (response) return response.json();
    return null;
  }).catch(function () {
    return null;
  });
}

// ─── Firebase initialization ─────────────────────────────────────────────────

function initializeFirebase(config) {
  if (messagingInitialized) return;

  try {
    firebase.initializeApp(config);
    var messaging = firebase.messaging();
    messagingInitialized = true;

    messaging.onBackgroundMessage(function (payload) {
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
  } catch (e) {
    // Firebase may throw if already initialized — safe to ignore
  }
}

// ─── Self-initialize from cached config on SW startup ────────────────────────
// This handles mobile cold-starts where the SW is killed and restarted
// by the browser for an incoming push, without the page being active.

loadConfigFromCache().then(function (config) {
  if (config) {
    initializeFirebase(config);
  }
});

// ─── Listen for config from the main app ─────────────────────────────────────

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !messagingInitialized) {
    var config = event.data.config;
    // Persist config for future cold-starts
    saveConfigToCache(config);
    initializeFirebase(config);
  }
});

// ─── Push fallback: show notification even if Firebase isn't initialized ──────
// On mobile, the SW may be cold-started by a push before the async
// loadConfigFromCache() resolves. In that case Firebase won't be ready
// and the message would be lost. This handler catches that scenario.

self.addEventListener('push', function (event) {
  if (messagingInitialized) return; // Firebase SDK will handle it

  var payload;
  try {
    payload = event.data ? event.data.json() : null;
  } catch (e) {
    return;
  }
  if (!payload) return;

  // Try to initialize from cache first (may succeed if cache is fast)
  var initPromise = loadConfigFromCache().then(function (config) {
    if (config && !messagingInitialized) {
      initializeFirebase(config);
    }
  });

  // If Firebase initialized during the cache load, it will handle
  // the message via onBackgroundMessage. If not, show manually.
  event.waitUntil(
    initPromise.then(function () {
      if (messagingInitialized) return; // Firebase picked it up

      var notification = payload.notification || {};
      var data = payload.data || {};
      var title = notification.title || data.title;

      if (!title) return;

      var tag = data.notificationId || data.category || 'default';

      return self.registration.showNotification(title, {
        body: notification.body || data.body || '',
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: tag,
        renotify: true,
        data: data,
        vibrate: [200, 100, 200],
      });
    })
  );
});

// ─── Notification click handler ──────────────────────────────────────────────

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

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = resolveClickUrl(event.notification.data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
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

// ─── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
