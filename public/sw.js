/**
 * Launchpad Service Worker
 * Gère les notifications push Web Push API
 */

const VERSION = '1.0.0'

// Activation immédiate
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Push notification reçue
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, icon = '/favicon.ico', badge, url = '/', tag } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: badge || icon,
      tag: tag || 'launchpad',
      requireInteraction: false,
      data: { url },
    })
  )
})

// Clic sur la notification → ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const url = event.notification.data?.url || '/'
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
