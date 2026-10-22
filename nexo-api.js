/**
 * NEXO - API & Client Integration (Java 17 Backend + Firebase)
 * Pontificia Universidad Javeriana (PUJ).
 *
 * Orden de conexión:
 *   1. Backend Java 17 en http://localhost:8080/api (si está corriendo), autenticado
 *      con el ID token de Firebase.
 *   2. Firebase Web SDK directo a Cloud Firestore (lo que usa la app publicada en Hosting).
 *   3. Datos locales de demostración, solo si Firebase no está configurado.
 *
 * Toda respuesta se normaliza (normalizeSubject / normalizeReport) para que la
 * interfaz reciba siempre la misma forma, venga del backend Java o de Firestore.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG, API_BASE } from './firebase-config.js?v=20261022';

// Mapeo canónico de roles
export const ROL_MAP = {
  ESTUDIANTE: 'est',
  DOCENTE: 'doc',
  DIRECCION: 'dir',
  DOCENTE_DIRECTIVO: 'mix',
  ADMIN: 'adm',
  est: 'ESTUDIANTE',
  doc: 'DOCENTE',
  dir: 'DIRECCION',
  mix: 'DOCENTE_DIRECTIVO',
  adm: 'ADMIN'
};

// Mapeo canónico de estados
export const EST_MAP = {
  PENDIENTE: 'pend',
  EN_REVISION: 'rev',
  ATENDIDO: 'ok',
  pend: 'PENDIENTE',
  rev: 'EN_REVISION',
  ok: 'ATENDIDO'
};

export const EST_LABELS = {
  pend: 'Pendiente',
  rev: 'En revisión',
  ok: 'Atendido'
};

// Escala de valoración de 5 caritas (0 = Muy mal … 4 = Muy bien)
export const MOOD_LABELS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];

// ===============================================================
// FORMULARIO DE EVALUACIÓN (dimensiones inspiradas en el SEEQ)
// ===============================================================
// Escala Likert de acuerdo (0 = Totalmente en desacuerdo … 4 = Totalmente de acuerdo).
// Una respuesta vacía (null) no cuenta en el promedio.
export const LIKERT_LABELS = ['Totalmente en desacuerdo', 'En desacuerdo', 'Ni de acuerdo ni en desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'];

// Categorías que califican al docente. La valoración de cada una (moods[key]) es el
// promedio de sus preguntas, en la misma escala 0-4 de las caritas.
export const CATEGORIAS = [
  {
    key: 'claridad', nombre: 'Claridad', titulo: 'Claridad y organización del curso', frase: 'la claridad del curso',
    help: 'Piensa en los objetivos de la materia y en cómo se ordenaron los temas.',
    preguntas: [
      { id: 'p1', n: 1, q: 'Desde el inicio del curso, el docente dejó claro qué debía aprender y lograr.' },
      { id: 'p2', n: 2, q: 'Los temas se presentaron en un orden que me permitió entender cómo se conectaban entre sí.' }
    ]
  },
  {
    key: 'explicaciones', nombre: 'Explicaciones', titulo: 'Calidad de las explicaciones', frase: 'las explicaciones',
    help: 'Piensa en cómo el docente explica en clase y en los ejemplos que usa.',
    preguntas: [
      { id: 'p3', n: 3, q: 'Las explicaciones del docente me ayudaron a comprender los contenidos.' },
      { id: 'p4', n: 4, q: 'El docente usó ejemplos o actividades que facilitaron mi aprendizaje.' }
    ]
  },
  {
    key: 'evaluacion', nombre: 'Evaluación', titulo: 'Evaluación y retroalimentación', frase: 'la evaluación',
    help: 'Piensa en los parciales, trabajos y talleres, y en los comentarios que recibiste.',
    preguntas: [
      { id: 'p5', n: 5, q: 'Las evaluaciones (parciales, trabajos, talleres) correspondieron con lo trabajado en el curso.' },
      { id: 'p6', n: 6, q: 'Los criterios de calificación fueron claros antes de cada evaluación.' },
      { id: 'p7', n: 7, q: 'La retroalimentación que recibí me indicó concretamente cómo mejorar.' }
    ]
  },
  {
    key: 'acompanamiento', nombre: 'Acompañamiento', titulo: 'Acompañamiento y relación con los estudiantes', frase: 'el acompañamiento',
    help: 'Piensa en la disposición del docente para ayudarte y en el ambiente de la clase.',
    preguntas: [
      { id: 'p8', n: 8, q: 'Cuando tuve dudas o dificultades, pude obtener ayuda del docente.' },
      { id: 'p9', n: 9, q: 'El docente promovió la participación y las preguntas en clase.' },
      { id: 'p10', n: 10, q: 'El docente trató a los estudiantes con respeto.' }
    ]
  }
];

// Datos de contexto: no se promedian con las categorías del docente.
// Usan la misma escala de acuerdo que las demás preguntas.
export const CONTEXTO = [
  { id: 'carga', n: 11, q: 'La carga de trabajo fue adecuada para lo que se esperaba que aprendiera.' },
  { id: 'dificultad', n: 12, q: 'El nivel de dificultad fue adecuado para lo que se esperaba que aprendiera.' },
  { id: 'p13', n: 13, q: 'Siento que aprendí mucho en esta materia.' },
  { id: 'p14', n: 14, q: 'En general, estoy satisfecho/a con esta materia.' }
];
export const HORAS = { n: 15, q: '¿Cuántas horas a la semana dedicaste a esta materia fuera de clase?', labels: ['0–2', '3–5', '6–8', '9 o más'] };

/** Promedio 0-4 de una categoría, sin contar "No aplica". null si no hay respuestas. */
export function promedioCategoria(respuestas, cat) {
  const vals = cat.preguntas.map(p => respuestas?.[p.id]).filter(v => Number.isInteger(v) && v >= 0 && v <= 4);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Estado del backend en Java
let isJavaBackendActive = false;

// Detección de Firebase SDK
const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG?.apiKey &&
  !FIREBASE_CONFIG.apiKey.startsWith('TU_') &&
  FIREBASE_CONFIG.projectId
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('[Nexo] Error inicializando Firebase SDK:', err);
  }
}

// ===============================================================
// NORMALIZACIÓN DE DATOS
// ===============================================================
function toIso(v) {
  if (!v) return new Date().toISOString();
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return new Date(v).toISOString();
}

function clampMood(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : 2;
}

function initialsOf(text) {
  const words = String(text || '').split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w));
  const ini = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return ini || 'NX';
}

export function normalizeSubject(s) {
  return {
    id: s.id,
    nombre: s.nombre || 'Asignatura',
    abreviatura: (s.abreviatura && s.abreviatura.length <= 3) ? s.abreviatura.toUpperCase() : initialsOf(s.nombre),
    grupo: s.grupo || 'Grupo 1',
    profesor: s.professorNombre || s.profesor || 'Docente',
    professorUid: s.professorUid || '',
    studentUids: Array.isArray(s.studentUids) ? s.studentUids : []
  };
}

export function normalizeReport(r) {
  const moods = r.moods || {};
  const raw = String(r.estado || 'pend');
  const estado = ['pend', 'rev', 'ok'].includes(raw) ? raw : (EST_MAP[raw.toUpperCase()] || 'pend');
  return {
    id: r.id,
    subjectId: r.subjectId || '',
    asignatura: r.subjectNombre || r.asignatura || 'Asignatura',
    grupo: r.grupo || 'Grupo 1',
    professorUid: r.professorUid || '',
    studentUid: r.studentUid || '',
    studentNombre: r.studentNombre || 'Estudiante',
    categoria: r.categoria || CATEGORIAS[0].nombre,
    titulo: r.titulo || (r.detalle || '').slice(0, 65),
    detalle: r.detalle || '',
    moods: Object.fromEntries(CATEGORIAS.map(c => [c.key, clampMood(moods[c.key])])),
    comentarios: r.comentarios || {},
    // Respuestas del formulario por pregunta (p1…p14, carga, dificultad, horas)
    respuestas: r.respuestas && typeof r.respuestas === 'object' ? r.respuestas : {},
    mantener: r.mantener || '',
    estado,
    // Seguimiento: cambios de estado con su fecha (más antiguo primero)
    historial: (Array.isArray(r.historial) ? r.historial : [])
      .map(h => {
        const e = String(h?.estado || '');
        return { estado: ['pend', 'rev', 'ok'].includes(e) ? e : (EST_MAP[e.toUpperCase()] || 'pend'), fecha: toIso(h?.fecha) };
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)),
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt || r.createdAt)
  };
}

const byDateDesc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// ===============================================================
// DATOS LOCALES DE DEMOSTRACIÓN (solo sin Firebase)
// ===============================================================
const DEFAULT_USERS = {
  'estudiante@javeriana.edu.co': { uid: 'demo-est-01', email: 'estudiante@javeriana.edu.co', nombre: 'Mateo Silva', rol: 'est' },
  'profesor@javeriana.edu.co': { uid: 'demo-doc-01', email: 'profesor@javeriana.edu.co', nombre: 'María García', rol: 'doc' },
  'direccion@javeriana.edu.co': { uid: 'demo-dir-01', email: 'direccion@javeriana.edu.co', nombre: 'Ana Torres', rol: 'dir' },
  // Docente que además es jefe de sección o director de carrera
  'jefe@javeriana.edu.co': { uid: 'doc-torres', email: 'jefe@javeriana.edu.co', nombre: 'Julián Torres', rol: 'mix', aCargo: ['demo-doc-01'] }
};

const DEFAULT_SUBJECTS = [
  { id: 'calculo-g1', nombre: 'Cálculo Diferencial', abreviatura: 'CD', grupo: 'Grupo 1', professorNombre: 'Andrea Ruiz', professorUid: 'doc-ruiz', studentUids: ['demo-est-01'] },
  { id: 'estructuras-g1', nombre: 'Estructuras de Datos', abreviatura: 'ED', grupo: 'Grupo 1', professorNombre: 'María García', professorUid: 'demo-doc-01', studentUids: ['demo-est-01'] },
  { id: 'bases-g1', nombre: 'Bases de Datos I', abreviatura: 'BD', grupo: 'Grupo 1', professorNombre: 'María García', professorUid: 'demo-doc-01', studentUids: ['demo-est-01'] },
  { id: 'poo-g2', nombre: 'Programación Orientada a Objetos', abreviatura: 'PO', grupo: 'Grupo 2', professorNombre: 'Julián Torres', professorUid: 'doc-torres', studentUids: ['demo-est-01'] }
];

const daysAgo = (n) => new Date(Date.now() - 86400000 * n).toISOString();
const DEFAULT_REPORTS = [
  { id: 'demo-1', studentUid: 'demo-est-01', studentNombre: 'Mateo Silva', subjectId: 'estructuras-g1', subjectNombre: 'Estructuras de Datos', grupo: 'Grupo 1', professorUid: 'demo-doc-01', categoria: 'Explicaciones', titulo: 'El ritmo de la clase es muy rápido', detalle: 'El ritmo de la clase es muy rápido, no alcanzo a tomar apuntes y los temas de árboles y grafos se acumulan antes del parcial.', moods: { claridad: 2, explicaciones: 1, evaluacion: 2, acompanamiento: 3 }, respuestas: { p1: 2, p2: 2, p3: 1, p4: 1, p5: 2, p6: 2, p7: 2, p8: 3, p9: 3, p10: 4, carga: 4, dificultad: 3, p13: 2, p14: 1, horas: 2 }, mantener: 'Los talleres en grupo.', comentarios: {}, estado: 'pend', createdAt: daysAgo(2) },
  { id: 'demo-2', studentUid: 'demo-est-02', studentNombre: 'Laura Díaz', subjectId: 'bases-g1', subjectNombre: 'Bases de Datos I', grupo: 'Grupo 1', professorUid: 'demo-doc-01', categoria: 'Evaluación', titulo: 'Los ejemplos de normalización no corresponden con el taller', detalle: 'Los ejemplos de normalización vistos en clase no corresponden con los ejercicios propuestos para el taller.', moods: { claridad: 3, explicaciones: 3, evaluacion: 1, acompanamiento: 3 }, respuestas: { p1: 3, p2: 3, p3: 3, p4: 3, p5: 1, p6: 1, p7: 2, p8: 3, p9: null, p10: 4, carga: 2, dificultad: 3, p13: 3, p14: 3, horas: 1 }, mantener: '', comentarios: {}, estado: 'rev', createdAt: daysAgo(6) },
  { id: 'demo-4', studentUid: 'demo-est-01', studentNombre: 'Mateo Silva', subjectId: 'poo-g2', subjectNombre: 'Programación Orientada a Objetos', grupo: 'Grupo 2', professorUid: 'doc-torres', categoria: 'Claridad', titulo: 'No queda claro qué se evalúa en el proyecto final', detalle: 'No queda claro qué se evalúa en el proyecto final ni cómo se conecta con los talleres de herencia.', moods: { claridad: 1, explicaciones: 3, evaluacion: 2, acompanamiento: 3 }, respuestas: { p1: 1, p2: 1, p3: 3, p4: 3, p5: 2, p6: 1, p7: 3, p8: 3, p9: 4, p10: 4, carga: 3, dificultad: 2, p13: 3, p14: 2, horas: 2 }, mantener: 'Las asesorías antes de las entregas.', comentarios: {}, estado: 'pend', createdAt: daysAgo(3) },
  { id: 'demo-3', studentUid: 'demo-est-02', studentNombre: 'Laura Díaz', subjectId: 'calculo-g1', subjectNombre: 'Cálculo Diferencial', grupo: 'Grupo 1', professorUid: 'doc-ruiz', categoria: 'Evaluación', titulo: 'Falta retroalimentación detallada en las tareas', detalle: 'Falta retroalimentación detallada en las tareas entregadas, solo recibimos la nota.', moods: { claridad: 2, explicaciones: 2, evaluacion: 0, acompanamiento: 1 }, respuestas: { p1: 2, p2: 2, p3: 2, p4: 2, p5: 1, p6: 0, p7: 0, p8: 1, p9: 1, p10: 3, carga: 3, dificultad: 2, p13: 2, p14: 1, horas: 1 }, mantener: '', comentarios: {}, estado: 'ok', createdAt: daysAgo(12) }
];

// v4: reportes con las categorías del formulario de evaluación docente y perfil docente directivo
const STORAGE_KEY = 'nexo_local_db_v4';
function loadLocalDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { subjects: DEFAULT_SUBJECTS, reports: DEFAULT_REPORTS };
}
function saveLocalDb(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}

let localDb = loadLocalDb();
let currentProfile = null;

// ===============================================================
// BACKEND JAVA
// ===============================================================
async function checkJavaBackend() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(timeout);
    // En Hosting, /api/health se reescribe a Nexo.html (200 OK con HTML),
    // así que solo se considera activo si responde el JSON del backend.
    const data = res.ok ? await res.json().catch(() => null) : null;
    isJavaBackendActive = Boolean(data && data.status === 'ok');
  } catch (e) {
    isJavaBackendActive = false;
  }
  return isJavaBackendActive;
}

const javaReady = checkJavaBackend();

// Token para el backend Java: ID token real de Firebase si hay sesión,
// o el uid demo cuando el backend corre en modo Local Mock.
async function bearerToken(me) {
  if (auth?.currentUser) {
    try { return await auth.currentUser.getIdToken(); } catch (e) {}
  }
  return me?.token || me?.uid || 'demo-est-01';
}

async function javaFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await bearerToken(currentProfile)}`,
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status} en el backend Java`);
  return data;
}

// Firestore solo se usa con un usuario autenticado en Firebase
const useFirestore = () => Boolean(db && auth?.currentUser);

// Consulta de reportes que respeta las reglas de seguridad según el rol
function reportsQuery(me) {
  const col = collection(db, 'reports');
  if (me.rol === 'est') return query(col, where('studentUid', '==', me.uid));
  if (me.rol === 'doc') return query(col, where('professorUid', '==', me.uid));
  return col;
}

function visibleLocalReports(me) {
  const list = localDb.reports.map(normalizeReport);
  if (me.rol === 'est') return list.filter(r => r.studentUid === me.uid);
  if (me.rol === 'doc') return list.filter(r => r.professorUid === me.uid);
  return list;
}

function formatProfile(uid, data) {
  const nombre = data.nombre || 'Usuario Javeriana';
  const partes = nombre.trim().split(/\s+/);
  const primer = partes[0] || 'Usuario';
  const ini = partes.length > 1 ? (partes[0][0] + partes[1][0]).toUpperCase() : primer.slice(0, 2).toUpperCase();
  return {
    uid,
    email: data.email || '',
    nombre,
    primerNombre: primer,
    iniciales: ini,
    rol: ROL_MAP[data.rol] && data.rol.length > 3 ? ROL_MAP[data.rol] : (data.rol || 'est'),
    // Docente directivo: uids de los docentes de su sección (vacío = todo el programa)
    aCargo: Array.isArray(data.aCargo) ? data.aCargo : []
  };
}

async function loadFirebaseProfile(user, fallbackEmail) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return formatProfile(user.uid, snap.data());

  const email = (user.email || fallbackEmail || '').toLowerCase();
  const nombre = email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  // Todo perfil nuevo nace como estudiante; DOCENTE/DIRECCION se asignan desde el
  // backend (AsignarRol) y las reglas impiden autoasignarlos.
  const data = { email, nombre, rol: 'ESTUDIANTE', createdAt: serverTimestamp() };
  await setDoc(ref, data);
  return formatProfile(user.uid, data);
}

function translateAuthError(err) {
  const code = err.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('email-already-in-use')) {
    return 'Correo institucional o contraseña incorrectos.';
  }
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('too-many-requests')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (code.includes('network')) return 'Sin conexión con Firebase. Revisa tu internet.';
  return err.message || 'No fue posible iniciar sesión.';
}

// ===============================================================
// API PÚBLICA DE NEXO
// ===============================================================
export const NexoAPI = {
  get isJavaActive() { return isJavaBackendActive; },
  isFirebaseActive: Boolean(db && auth),
  projectId: FIREBASE_CONFIG?.projectId || 'nexo-7a24e',

  async checkStatus() {
    await checkJavaBackend();
    return {
      java: isJavaBackendActive,
      firebase: this.isFirebaseActive,
      backendType: isJavaBackendActive ? 'Java 17 (Maven)' : (this.isFirebaseActive ? 'Firebase' : 'Local')
    };
  },

  // -------------------------------------------------------------
  // HU-01: Autenticación institucional con roles
  // -------------------------------------------------------------

  /** Recupera la sesión de Firebase al recargar la página (o null si no hay). */
  async restoreSession() {
    if (!this.isFirebaseActive) return null;
    const user = await new Promise(resolve => {
      const off = onAuthStateChanged(auth, u => { off(); resolve(u); });
    });
    if (!user) return null;
    try {
      currentProfile = await loadFirebaseProfile(user);
      return currentProfile;
    } catch (e) {
      console.warn('[Nexo] No se pudo recuperar el perfil:', e.message);
      return null;
    }
  },

  async login(email, password, requestedRole = 'est') {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail.endsWith('@javeriana.edu.co')) {
      throw new Error('Solo se permiten cuentas con correo institucional (@javeriana.edu.co).');
    }
    if (!password || password.length < 4) {
      throw new Error('Ingresa una contraseña válida.');
    }

    // 1. Firebase Authentication (también da el token para el backend Java)
    if (this.isFirebaseActive) {
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (signInErr) {
        if (signInErr.code !== 'auth/user-not-found' && signInErr.code !== 'auth/invalid-credential') {
          throw new Error(translateAuthError(signInErr));
        }
        // Cuenta nueva: se registra como estudiante
        try {
          credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (createErr) {
          throw new Error(translateAuthError(createErr));
        }
      }
      currentProfile = await loadFirebaseProfile(credential.user, cleanEmail);
      return currentProfile;
    }

    // 2. Backend Java en modo Local Mock (sin Firebase en el cliente)
    if (await checkJavaBackend()) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, role: requestedRole })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No fue posible iniciar sesión.');
      currentProfile = { ...formatProfile(data.uid, data), token: data.token };
      return currentProfile;
    }

    // 3. Demo local
    const base = DEFAULT_USERS[cleanEmail] || {
      uid: 'user-' + cleanEmail.split('@')[0],
      email: cleanEmail,
      nombre: cleanEmail.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
      rol: requestedRole
    };
    currentProfile = formatProfile(base.uid, { ...base, rol: DEFAULT_USERS[cleanEmail] ? base.rol : requestedRole });
    return currentProfile;
  },

  async logout() {
    currentProfile = null;
    if (this.isFirebaseActive && auth) {
      try { await signOut(auth); } catch (e) {}
    }
    return true;
  },

  async me() {
    return currentProfile;
  },

  /** Perfil público de otro usuario (p. ej. el correo del docente para contactarlo). */
  async profileOf(uid) {
    if (!uid || !useFirestore()) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? formatProfile(uid, snap.data()) : null;
    } catch (e) {
      return null;
    }
  },

  // -------------------------------------------------------------
  // HU-02 & HU-03: Asignaturas inscritas / a cargo
  // -------------------------------------------------------------
  async subjects() {
    const me = currentProfile;
    if (!me) return [];
    await javaReady;

    if (isJavaBackendActive) {
      try {
        const list = await javaFetch('/subjects');
        if (Array.isArray(list)) return list.map(normalizeSubject);
      } catch (e) {
        console.warn('[Nexo] Backend Java /subjects:', e.message);
      }
    }

    if (useFirestore()) {
      const snap = await getDocs(collection(db, 'subjects'));
      const list = [];
      snap.forEach(d => list.push(normalizeSubject({ id: d.id, ...d.data() })));
      if (me.rol === 'est') return list.filter(s => s.studentUids.includes(me.uid));
      if (me.rol === 'doc') return list.filter(s => s.professorUid === me.uid);
      return list;
    }

    const list = localDb.subjects.map(normalizeSubject);
    if (me.rol === 'est') return list.filter(s => s.studentUids.includes(me.uid));
    if (me.rol === 'doc') return list.filter(s => s.professorUid === me.uid);
    return list;
  },

  // -------------------------------------------------------------
  // HU-02: Creación de reportes de dificultades académicas
  // payload: { subjectId, respuestas: {p1…p14 (0-4 o null = No aplica),
  //            carga, dificultad (0-4), horas (0-3)}, mantener, detalle }
  // -------------------------------------------------------------
  async createReport(payload) {
    const me = currentProfile;
    if (!me) throw new Error('Inicia sesión para enviar un reporte.');
    const detalle = (payload.detalle || '').trim();

    if (detalle.length < 20) {
      throw new Error('La descripción debe tener al menos 20 caracteres.');
    }

    // Solo se guardan las preguntas conocidas, con valores dentro de su escala
    const valid = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);
    const respuestas = {};
    for (const p of [...CATEGORIAS.flatMap(c => c.preguntas), ...CONTEXTO]) respuestas[p.id] = valid(payload.respuestas?.[p.id], 4);
    respuestas.horas = valid(payload.respuestas?.horas, HORAS.labels.length - 1);

    // Valoración por categoría: promedio de sus preguntas (neutro si todo fue "No aplica")
    const moods = Object.fromEntries(CATEGORIAS.map(c => [c.key, clampMood(promedioCategoria(respuestas, c) ?? 2)]));
    const mantener = (payload.mantener || '').trim();
    const comentarios = {};

    await javaReady;

    // 1. Backend Java
    if (isJavaBackendActive) {
      const created = await javaFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({ subjectId: payload.subjectId, moods, comentarios, respuestas, mantener, detalle })
      });
      return normalizeReport(created);
    }

    // 2. Cálculo de categoría (la de peor valoración) y título
    const subj = (await this.subjects()).find(s => s.id === payload.subjectId);
    if (!subj) throw new Error('Selecciona una asignatura válida.');

    // Categoría con la peor valoración (con el promedio sin redondear)
    const score = (c) => promedioCategoria(respuestas, c) ?? 2;
    let categoria = CATEGORIAS[0];
    for (const c of CATEGORIAS) if (score(c) < score(categoria)) categoria = c;
    const limpio = detalle.replace(/\s+/g, ' ');
    const titulo = limpio.length <= 65 ? limpio : limpio.slice(0, 65).replace(/\s\S*$/, '') + '…';

    const data = {
      studentUid: me.uid,
      studentNombre: me.nombre,
      subjectId: subj.id,
      subjectNombre: subj.nombre,
      grupo: subj.grupo,
      professorUid: subj.professorUid,
      categoria: categoria.nombre,
      titulo,
      detalle,
      moods,
      comentarios,
      respuestas,
      mantener
    };

    // 3. Cloud Firestore
    if (useFirestore()) {
      const ref = await addDoc(collection(db, 'reports'), {
        ...data,
        estado: 'PENDIENTE',
        historial: [{ estado: 'PENDIENTE', por: me.uid, fecha: new Date().toISOString() }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return normalizeReport({ id: ref.id, ...data, estado: 'PENDIENTE', historial: [{ estado: 'PENDIENTE', fecha: new Date().toISOString() }] });
    }

    // 4. Demo local
    const local = { id: 'rep-' + Date.now(), ...data, estado: 'pend', createdAt: new Date().toISOString() };
    localDb.reports.unshift(local);
    saveLocalDb(localDb);
    return normalizeReport(local);
  },

  // -------------------------------------------------------------
  // HU-03: Consulta y seguimiento de reportes
  // -------------------------------------------------------------
  async reports() {
    const me = currentProfile;
    if (!me) return [];
    await javaReady;

    if (isJavaBackendActive) {
      try {
        const list = await javaFetch('/reports');
        if (Array.isArray(list)) return list.map(normalizeReport).sort(byDateDesc);
      } catch (e) {
        console.warn('[Nexo] Backend Java /reports:', e.message);
      }
    }

    if (useFirestore()) {
      const snap = await getDocs(reportsQuery(me));
      const list = [];
      snap.forEach(d => list.push(normalizeReport({ id: d.id, ...d.data() })));
      return list.sort(byDateDesc);
    }

    return visibleLocalReports(me).sort(byDateDesc);
  },

  /** Escucha cambios de reportes en tiempo real. Devuelve la función para cancelar. */
  subscribeReports(callback) {
    const me = currentProfile;
    if (!me) return () => {};

    if (useFirestore() && !isJavaBackendActive) {
      return onSnapshot(reportsQuery(me), (snapshot) => {
        const list = [];
        snapshot.forEach(d => list.push(normalizeReport({ id: d.id, ...d.data() })));
        callback(list.sort(byDateDesc));
      }, (err) => console.warn('[Nexo] Tiempo real no disponible:', err.message));
    }

    // Backend Java o demo local: refresco periódico
    const timer = setInterval(async () => {
      try { callback(await this.reports()); } catch (e) {}
    }, 4000);
    return () => clearInterval(timer);
  },

  async setStatus(reportId, newStatus) {
    const me = currentProfile;
    const canonStatus = EST_MAP[newStatus] && newStatus.length <= 4 ? EST_MAP[newStatus] : newStatus;
    const uiStatus = EST_MAP[canonStatus] || 'pend';
    await javaReady;

    if (isJavaBackendActive) {
      await javaFetch(`/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: uiStatus })
      });
      return { id: reportId, estado: uiStatus };
    }

    if (useFirestore()) {
      await updateDoc(doc(db, 'reports', reportId), {
        estado: canonStatus,
        updatedAt: serverTimestamp(),
        historial: arrayUnion({ estado: canonStatus, por: me.uid, fecha: new Date().toISOString() })
      });
      return { id: reportId, estado: uiStatus };
    }

    const rep = localDb.reports.find(r => r.id === reportId);
    if (rep) {
      rep.estado = uiStatus;
      rep.updatedAt = new Date().toISOString();
      rep.historial = [...(rep.historial || []), { estado: uiStatus, fecha: rep.updatedAt }];
      saveLocalDb(localDb);
    }
    return { id: reportId, estado: uiStatus };
  }
};

if (typeof window !== 'undefined') {
  window.NexoAPI = NexoAPI;
}
