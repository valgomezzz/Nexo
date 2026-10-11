/*
 * Capa de conexión entre Nexo.html y el backend:
 *  - Firebase Authentication (inicio de sesión con correo institucional).
 *  - API REST en Java (Cloud Function "api"), enviando el idToken en cada petición.
 * Expone window.NexoAPI para que el script principal lo use.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { FIREBASE_CONFIG, API_BASE } from './firebase-config.js';

const enabled = !!FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('TU_');
const auth = enabled ? getAuth(initializeApp(FIREBASE_CONFIG)) : null;

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.'
};

async function call(method, path, body) {
  if (!auth?.currentUser) throw new Error('Debes iniciar sesión.');
  const token = await auth.currentUser.getIdToken();
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor de Nexo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

window.NexoAPI = {
  enabled,
  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw new Error(AUTH_ERRORS[e.code] || 'No se pudo iniciar sesión.');
    }
    try {
      return await call('GET', '/me');
    } catch (e) {
      await signOut(auth);
      throw e;
    }
  },
  logout: () => signOut(auth),
  resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
  me: () => call('GET', '/me'),
  subjects: () => call('GET', '/subjects'),
  reports: () => call('GET', '/reports'),
  createReport: (payload) => call('POST', '/reports', payload),
  setStatus: (id, estado) => call('PATCH', `/reports/${encodeURIComponent(id)}`, { estado }),
  stats: (params = {}) => call('GET', '/stats?' + new URLSearchParams(params))
};
