/**
 * Service Worker for ALS V2
 * Handles caching and Push Notifications
 */

const CACHE_NAME = 'als-v3';
const urlsToCache = [
    '/vite.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    return cacheName !== CACHE_NAME;
                }).map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - cache-first SOLO para assets estaticos verdaderos. Las llamadas a la
// API y el documento/codigo de la app (/, index.html, JS) nunca se interceptan aqui:
// deben llegar siempre frescos de la red, o quedan atrapados en una version vieja para
// siempre sin importar lo que se despliegue despues (asi se encontro este bug: un OIT
// mostraba datos de hace semanas porque "/" quedo cacheado desde la primera instalacion).
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isAppShellOrApi =
        url.pathname.startsWith('/api/') ||
        request.mode === 'navigate' ||
        url.pathname === '/' ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js');

    if (isAppShellOrApi) return; // deja pasar directo a la red

    event.respondWith(
        caches.match(request).then((response) => response || fetch(request))
    );
});

// =====================================
// PUSH NOTIFICATIONS
// =====================================

// Push event - receive push notifications
self.addEventListener('push', (event) => {
    console.log('📨 Push received:', event);

    let data = {
        title: 'Nueva Notificación',
        body: 'Tienes una nueva notificación en ALS',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'als-notification',
        data: { url: '/notifications' }
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            console.error('Error parsing push data:', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        tag: data.tag || 'als-notification',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: data.data,
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Default action or 'open' action - open the app
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow(urlToOpen);
                }
            })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Notification closed');
});
