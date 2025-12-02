import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// =========================
// IndexedDB Helper
// =========================
const DB_NAME = 'offline-posts';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePostOffline(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// =========================
// Función para enviar POST
// =========================
export async function sendPost(data) {
  try {
    const res = await fetch('/ruta-del-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error en la respuesta');
    console.log('POST enviado correctamente');
  } catch (err) {
    console.log('POST falló, guardando offline...', err);
    await savePostOffline(data);

    // Registrar Sync en SW
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      try {
        await reg.sync.register('sync-posts');
        console.log('Sync registrado en SW');
      } catch (syncErr) {
        console.log('Error registrando Sync:', syncErr);
      }
    }
  }
}

// ==========================================================================
// ========================= PUSH NOTIFICATIONS =============================
// ==========================================================================
const VAPID_PUBLIC_KEY =
  "BCttsQ8p3udf_sMFr_V2oxw6_w44Wq359S9z2ellDC3nSC_JgdfaoIzIKQd1Lva5bmrgq_EybozJlnAlPIuLIYU";

// Convertir Base64URL a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(registration) {
  try {
    console.log("Solicitando permiso de notificaciones...");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("Permiso de notificación denegado");
      return;
    }

    console.log("Permiso concedido, suscribiendo al PushManager...");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log("Suscripción generada:", subscription);

    // Enviar suscripción a tu backend o archivo local
    await fetch("http://localhost:3000/api/notificaciones/save-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    console.log("Suscripción enviada al servidor.");
  } catch (err) {
    console.error("Error al suscribirse al push:", err);
  }
}

// =========================
// Registrar Service Worker (esperando a que esté activo)
// =========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registrado");

      // Esperar a que el SW esté activo
      if (registration.installing) {
        await new Promise(resolve => {
          registration.installing.addEventListener('statechange', function(e) {
            if (e.target.state === 'activated') resolve();
          });
        });
      } else if (registration.waiting) {
        await new Promise(resolve => {
          registration.waiting.addEventListener('statechange', function(e) {
            if (e.target.state === 'activated') resolve();
          });
        });
      } // Si ya está activo, continúa

      // SUSCRIPCIÓN PUSH 🔥
      subscribeToPush(registration);

    } catch (err) {
      console.log("Error registrando SW:", err);
    }
  });
}

// =========================
// Render React
// =========================
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
