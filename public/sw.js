// ==================== IndexedDB helper ====================
const DB_NAME = 'offline-posts';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllPosts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function deletePost(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function savePostOffline(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(data);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ==================== Install & Cache ====================
self.addEventListener('install', event => {
    caches.open("appShell_v1.1")
        .then(cache => {
            cache.addAll([
                "/index.html",
                "/src/main.jsx",
                "/src/App.css",
                "/vite.svg",
                "/src/assets/react.svg",
            ]);
        });
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // Elimina caches antiguas
    caches.delete("appShell_v1.0");
    caches.delete("dynamic_v0.1");
});

// ==================== Fetch ====================
self.addEventListener('fetch', event => {
    if (event.request.method === "GET") {
        event.respondWith(
            caches.match(event.request)
            .then(cacheResp => {
                if (cacheResp) return cacheResp;

                return fetch(event.request)
                    .then(networkResp => {
                        caches.open("dynamic_v1.1")
                            .then(cache => {
                                cache.put(event.request, networkResp.clone());
                            });
                        return networkResp.clone();
                    })
                    .catch(() => caches.match("/index.html"));
            })
        );
    }
});

// ==================== Sync ====================
self.addEventListener('sync', event => {
    if (event.tag === 'sync-posts') {
        event.waitUntil(syncPosts());
    }
});

async function syncPosts() {
    const posts = await getAllPosts();
    for (const post of posts) {
        try {
            const res = await fetch('/ruta-del-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
            if (res.ok) {
                await deletePost(post.id);
            }
        } catch (err) {
            console.log('Sync failed for post', post.id);
        }
    }
}

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener("push", (event) => {
    console.log("[SW] Push recibido:", event);

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: "Smart Routine",
            body: event.data ? event.data.text() : "Tienes un nuevo mensaje 💡",
            url: "/"
        };
    }

    const title = data.title || "Smart Routine";
    const options = {
        body: data.body || "Tienes una nueva notificación.",
        icon: "/icons/icon-192.png",     // ruta a tu ícono
        badge: "/icons/icon-192.png",    // opcional: ícono pequeño
        data: {
            url: data.url || "/"
        },
        vibrate: [200, 100, 200],        // opcional: vibración
        requireInteraction: false        // opcional: se cierra automáticamente
    };

    // Muestra la notificación
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ==================== Notification Click ====================
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (let client of windowClients) {
                    if (client.url.includes(urlToOpen) && "focus" in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});
