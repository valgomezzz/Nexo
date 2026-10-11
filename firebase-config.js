/*
 * Configuración de Firebase para el frontend.
 * Cópiala desde: Consola de Firebase > Configuración del proyecto > Tus apps > App web.
 * Mientras apiKey empiece por "TU_", Nexo funciona en modo prototipo (datos de ejemplo).
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5ffDHG6dlyde-qVodmCDs1yGuY9IqZGs",
  authDomain: "nexo-7a24e.firebaseapp.com",
  projectId: "nexo-7a24e",
  storageBucket: "nexo-7a24e.firebasestorage.app",
  messagingSenderId: "935100505506",
  appId: "1:935100505506:web:03a22fb21e7dbbdff0e6fb",
  measurementId: "G-2874T2BZVR"
};

/*
 * Dirección de la API en Java.
 * - Publicado en Firebase Hosting: '/api' (Hosting redirige a la función).
 * - Probando en local con `mvn function:run`: 'http://localhost:8080'.
 */
export const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://localhost:8080'
  : '/api';
