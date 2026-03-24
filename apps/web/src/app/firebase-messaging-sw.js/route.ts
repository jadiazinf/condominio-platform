/**
 * Dynamic service worker route that injects Firebase config from environment variables.
 * Served at /firebase-messaging-sw.js so the browser registers it as a service worker.
 */
export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  }

  const swScript = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(firebaseConfig)});

const messaging = firebase.messaging();

/**
 * Resolve the URL a notification click should navigate to.
 * Falls back to the dashboard root if no routing data is present.
 */
function resolveClickUrl(data) {
  if (!data) return '/dashboard';

  // Explicit action-based routing
  if (data.action === 'payment_verified' || data.action === 'payment_rejected') {
    return data.paymentId ? '/dashboard/payments/' + data.paymentId : '/dashboard/payments';
  }
  if (data.action === 'ticket_resolved' || data.action === 'ticket_closed' || data.action === 'ticket_reply') {
    return data.ticketId ? '/dashboard/support/' + data.ticketId : '/dashboard/support';
  }
  if (data.action === 'quota_generated' || data.action === 'quota_reminder') {
    return data.quotaId ? '/dashboard/quotas/' + data.quotaId : '/dashboard/quotas';
  }

  // Category-based fallback routing
  if (data.category === 'payment') return '/dashboard/payments';
  if (data.category === 'quota') return '/dashboard/quotas';
  if (data.category === 'announcement') return '/dashboard/announcements';
  if (data.category === 'alert' || data.category === 'system') return '/dashboard/notifications';

  // Generic URL if the backend sent one
  if (data.url) return data.url;

  return '/dashboard';
}

messaging.onBackgroundMessage((payload) => {
  // Prevent duplicate: if the payload already has a notification field,
  // the browser may auto-display it. We only show manually if needed.
  if (payload.notification && payload.notification.title) {
    // Firebase compat sometimes auto-shows notification — showing ours
    // only when the SDK didn't already (data-only messages).
  }

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  var url = resolveClickUrl(event.notification.data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to reuse an existing window
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

// Activate new SW immediately so updated routing takes effect
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
`

  return new Response(swScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
