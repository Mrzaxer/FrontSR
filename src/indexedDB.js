import { openDB } from 'idb';

// Inicializar IndexedDB
export async function initDB() {
  const db = await openDB('offlineDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  console.log('✅ IndexedDB inicializada correctamente');
  return db;
}

// Guardar datos offline o enviarlos si hay internet
export async function sendPost({ tipo, data }) {
  const db = await initDB();

  // Forzar que tipo siempre sea "habitos"
  tipo = 'habitos';

  // Obtener usuarioId desde localStorage
  const usuarioId = localStorage.getItem('userId');
  if (!usuarioId || !/^[0-9a-fA-F]{24}$/.test(usuarioId)) {
    console.error('❌ UsuarioId inválido en localStorage, pendiente no guardado');
    return;
  }

  data.usuarioId = usuarioId;

  // Validar campos obligatorios
  if (!data.titulo) data.titulo = 'Sin título';
  if (!data.diasSemana || data.diasSemana.length === 0) data.diasSemana = ['lunes'];

  if (!navigator.onLine) {
    // Offline: guardar en IndexedDB
    await db.put('pending', { tipo, data });
    console.log('📥 Guardado en IndexedDB por estar offline:', data);
  } else {
    try {
      const res = await fetch(`http://localhost:3000/api/${tipo}/nuevo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      console.log('📤 Enviado al servidor:', result);

      // Si el backend responde con error, guardar en IndexedDB
      if (result.message) {
        console.warn('⚠ Error del servidor, guardando en IndexedDB:', result.message);
        await db.put('pending', { tipo, data });
      }
    } catch (err) {
      console.error('❌ Error enviando al servidor, guardando en IndexedDB:', err);
      await db.put('pending', { tipo, data });
    }
  }
}

// Obtener todos los pendientes
export async function getPending() {
  const db = await initDB();
  return await db.getAll('pending');
}

// Borrar pendiente por id
export async function clearPending(id) {
  const db = await initDB();
  await db.delete('pending', id);
  console.log('✅ Pendiente borrado de IndexedDB:', id);
}

// Sincronizar pendientes con el servidor cuando vuelve internet
export async function syncPending() {
  if (!navigator.onLine) return;

  const pendientes = await getPending();
  const db = await initDB();

  for (let item of pendientes) {
    // Corregir tipo antiguo "habito" a "habitos"
    if (item.tipo === 'habito') {
      item.tipo = 'habitos';
      await db.put('pending', item);
      console.log('♻ Pendiente antiguo corregido a "habitos":', item);
    }

    const usuarioId = localStorage.getItem('userId');
    if (!usuarioId || !/^[0-9a-fA-F]{24}$/.test(usuarioId)) {
      console.warn('❌ UsuarioId inválido, pendiente no enviado:', item);
      continue;
    }

    item.data.usuarioId = usuarioId;

    // Validar campos obligatorios
    if (!item.data.titulo) item.data.titulo = 'Sin título';
    if (!item.data.diasSemana || item.data.diasSemana.length === 0) item.data.diasSemana = ['lunes'];

    console.log('🔄 Enviando al servidor desde IndexedDB:', item.data);

    try {
      const res = await fetch(`http://localhost:3000/api/${item.tipo}/nuevo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      const result = await res.json();
      console.log('✅ Pendiente sincronizado:', result);

      // Solo borrar si el servidor respondió correctamente
      if (!result.message) await clearPending(item.id);
    } catch (err) {
      console.error('❌ Error sincronizando pendiente', err);
    }
  }
}
