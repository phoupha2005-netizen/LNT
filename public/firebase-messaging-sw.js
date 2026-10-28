// Firebase Cloud Messaging Service Worker for LNT Football Connect
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
firebase.initializeApp({
  apiKey: "AIzaSyBlDXGOK4ig1ZrDvYLpr5WsGm3y30t5JzU",
  authDomain: "gen-lang-client-0182285247.firebaseapp.com",
  projectId: "gen-lang-client-0182285247",
  storageBucket: "gen-lang-client-0182285247.firebasestorage.app",
  messagingSenderId: "545750596316",
  appId: "1:545750596316:web:d1a36f171cc8c8dd661219"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'LNT Football Connect';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'ມີໂພສຫາຄູ່ເຕະບານໃໝ່!',
    icon: payload.notification?.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: payload.data?.postId ? `post-${payload.data.postId}` : 'lnt-football-post',
    data: {
      url: payload.data?.url || (payload.data?.postId ? `/?postId=${payload.data.postId}` : '/'),
      postId: payload.data?.postId || null
    },
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const targetPostId = event.notification.data?.postId || null;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and notify it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            postId: targetPostId,
            url: targetUrl
          });
          return client.focus();
        }
      }
      // If no window open, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
