// Firebase Messaging Service Worker
// This file handles background push notifications via Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDummyKeyForSW',
  projectId: 'codominioapp',
  messagingSenderId: '349227334352',
  appId: '1:349227334352:web:2aef2ae65751ea5fad3cd5',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}

  if (title) {
    self.registration.showNotification(title, {
      body: body || '',
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: payload.data || {},
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/'

  if (data.action === 'payment_verified' || data.action === 'payment_rejected') {
    url = data.paymentId ? `/dashboard/payments/${data.paymentId}` : '/dashboard/payments'
  } else if (data.action === 'ticket_resolved' || data.action === 'ticket_closed') {
    url = data.ticketId ? `/dashboard/support/${data.ticketId}` : '/dashboard/support'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
