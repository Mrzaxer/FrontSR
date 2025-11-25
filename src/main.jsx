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

// =========================
// Registrar Service Worker
// =========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.log('Error registrando SW:', err));
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
