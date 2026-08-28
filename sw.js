// Service Worker for Jasmine's Scholarship Hub - PWA offline support + notifications

const CACHE_NAME = 'jasmine-scholarship-hub-v3';
const urlsToCache = [
  '/jasmine/',
  '/jasmine/index.html',
  '/jasmine/parents.html',
];

// Daily reminder messages
const DAILY_MESSAGES = [
  "Time to work on scholarships! You've got this! 🌟",
  "Hey superstar! 15 minutes on essays today? You can do it! 💜",
  "Keep building that future! 🎓",
  "Your hard work is paying off! Let's get those scholarships! 🔥",
  "Check in on your goals today! ✨",
  "You're making progress every day! 📸",
  "Quick check-in: any deadlines coming up? 💪",
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - always go to network
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;

        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        return caches.match('/jasmine/index.html');
      })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Time to work on scholarships!',
    icon: '/jasmine/icon-192.png',
    badge: '/jasmine/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: '/jasmine/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Later' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification("Jasmine's Scholarship Hub", options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.openWindow('/jasmine/')
  );
});
