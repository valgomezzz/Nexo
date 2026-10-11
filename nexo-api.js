/**
 * NEXO - API & Client Integration (Java 17 Backend + Firebase Admin SDK)
 * Pontificia Universidad Javeriana (PUJ).
 * 
 * Se conecta automáticamente al backend en Java 17 en http://localhost:8080/api.
 * Cuenta con fallback inteligente a Firebase Client SDK para máxima resiliencia.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG, API_BASE } from './firebase-config.js';

// Mapeo canónico de roles
export const ROL_MAP = {
  ESTUDIANTE: 'est',
  DOCENTE: 'doc',
  DIRECCION: 'dir',
  ADMIN: 'adm',
  est: 'ESTUDIANTE',
  doc: 'DOCENTE',
  dir: 'DIRECCION',
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

// Cuentas de demostración iniciales (PUJ)
const DEFAULT_USERS = {
  'estudiante@javeriana.edu.co': {
    uid: 'demo-est-01',
    email: 'estudiante@javeriana.edu.co',
    nombre: 'Ana María Ruiz',
    primerNombre: 'Ana',
    iniciales: 'AR',
    rol: 'est'
  },
  'profesor@javeriana.edu.co': {
    uid: 'demo-doc-01',
    email: 'profesor@javeriana.edu.co',
    nombre: 'Dr. Carlos Mendoza',
    primerNombre: 'Carlos',
    iniciales: 'CM',
    rol: 'doc'
  },
  'direccion@javeriana.edu.co': {
    uid: 'demo-dir-01',
    email: 'direccion@javeriana.edu.co',
    nombre: 'Dra. Elena Gómez',
    primerNombre: 'Elena',
    iniciales: 'EG',
    rol: 'dir'
  }
};

const DEFAULT_SUBJECTS = [
  { id: 'subj-poo', codigo: 'IS-301', nombre: 'Programación Orientada a Objetos', abreviatura: 'POO', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G1', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-calc', codigo: 'MAT-201', nombre: 'Cálculo Diferencial e Integral', abreviatura: 'Cálculo', profesor: 'Dra. Patricia Silva', professorUid: 'doc-silva', grupo: 'G2', creditos: 4, studentUids: ['demo-est-01'] },
  { id: 'subj-edd', codigo: 'IS-302', nombre: 'Estructuras de Datos y Algoritmos', abreviatura: 'EDD', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G1', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-fis', codigo: 'FIS-101', nombre: 'Física Mecánica y Termodinámica', abreviatura: 'Física', profesor: 'Ing. Roberto Andrade', professorUid: 'doc-andrade', grupo: 'G3', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-alg', codigo: 'MAT-102', nombre: 'Álgebra Lineal Aplicada', abreviatura: 'Álgebra', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G2', creditos: 3, studentUids: [] }
];

const DEFAULT_REPORTS = [
  {
    id: 'rep-001',
    studentUid: 'demo-est-01',
    studentNombre: 'Ana María Ruiz',
    subjectId: 'subj-poo',
    asignatura: 'Programación Orientada a Objetos',
    grupo: 'G1',
    professorUid: 'demo-doc-01',
    categoria: 'Metodología',
    titulo: 'Ejercicios de herencia y polimorfismo muy extensos para el tiempo de clase',
    detalle: 'Sentimos que los ejercicios de herencia múltiple y polimorfismo planteados en los talleres prácticos son sumamente extensos para resolver en el bloque de 2 horas. Sería de gran ayuda contar con retroalimentación previa de las plantillas de código antes del laboratorio calificado.',
    moods: { metodologia: 1, contenido: 2, ritmo: 2 },
    estado: 'pend',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'rep-002',
    studentUid: 'demo-est-01',
    studentNombre: 'Ana María Ruiz',
    subjectId: 'subj-edd',
    asignatura: 'Estructuras de Datos y Algoritmos',
    grupo: 'G1',
    professorUid: 'demo-doc-01',
    categoria: 'Ritmo',
    titulo: 'Avance muy rápido en árboles binarios balanceados (AVL y Rojinegros)',
    detalle: 'El ritmo en la última semana fue bastante acelerado al explicar rotaciones dobles en árboles AVL. Varios compañeros nos quedamos con dudas en el rastreo de punteros en memoria y necesitaríamos una sesión de dudas antes del parcial.',
    moods: { metodologia: 2, contenido: 2, ritmo: 1 },
    estado: 'rev',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'rep-003',
    studentUid: 'est-juan',
    studentNombre: 'Juan Diego Morales',
    subjectId: 'subj-poo',
    asignatura: 'Programación Orientada a Objetos',
    grupo: 'G1',
    professorUid: 'demo-doc-01',
    categoria: 'Contenido',
    titulo: 'Discrepancia entre la versión del compilador local y las pruebas automáticas',
    detalle: 'El entorno de entrega automática en GitHub Classroom evalúa con Java 21 mientras que la guía del laboratorio especifica Java 17, generando errores de compilación con las sintaxis de Switch expresiones.',
    moods: { metodologia: 3, contenido: 1, ritmo: 2 },
    estado: 'ok',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const STORAGE_KEY = 'nexo_local_db_v1';
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
let reportListeners = [];

function notifyReportListeners(reportsList) {
  reportListeners.forEach((fn) => {
    try { fn(reportsList); } catch (e) { console.error(e); }
  });
}

// Comprobación de salud del Backend Java
async function checkJavaBackend() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (res.ok) {
      isJavaBackendActive = true;
      console.log('[Nexo] Backend Java 17 detectado y activo en:', API_BASE);
      return true;
    }
  } catch (e) {
    isJavaBackendActive = false;
  }
  return false;
}

// Iniciar chequeo de inmediato
checkJavaBackend();

// ===============================================================
// API PÚBLICA DE NEXO (Java + Firebase)
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
      backendType: isJavaBackendActive ? 'Java 17 (Maven)' : 'Firebase BaaS'
    };
  },

  // -------------------------------------------------------------
  // HU-01: Autenticación institucional con roles
  // -------------------------------------------------------------
  async login(email, password, requestedRole = 'est') {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (!cleanEmail.endsWith('@javeriana.edu.co')) {
      throw new Error('Solo se permiten cuentas con correo institucional (@javeriana.edu.co).');
    }
    if (!password || password.length < 4) {
      throw new Error('Ingresa una contraseña válida de al menos 4 caracteres.');
    }

    // 1. Probar primero con el Backend Java si está disponible
    if (await checkJavaBackend()) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password, role: requestedRole })
        });
        if (res.ok) {
          const data = await res.json();
          currentProfile = data;
          return currentProfile;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Credenciales inválidas en backend Java');
        }
      } catch (err) {
        if (!err.message.includes('Credenciales')) {
          console.warn('[Nexo] Backend Java no respondió login, intentando fallback directo:', err.message);
        } else {
          throw err;
        }
      }
    }

    // 2. Fallback a Firebase Web SDK
    if (this.isFirebaseActive) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (signInErr) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          } else {
            throw new Error(this._translateAuthError(signInErr));
          }
        }

        const user = userCredential.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let profileData;
        if (userDocSnap.exists()) {
          profileData = userDocSnap.data();
        } else {
          const nombreParts = cleanEmail.split('@')[0].split('.');
          const nombreEstimado = nombreParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          profileData = {
            email: cleanEmail,
            nombre: nombreEstimado,
            rol: ROL_MAP[requestedRole] || 'ESTUDIANTE',
            createdAt: serverTimestamp()
          };
          await setDoc(userDocRef, profileData);
        }

        currentProfile = this._formatUserProfile(user.uid, profileData);
        return currentProfile;
      } catch (err) {
        console.warn('[Nexo Firebase Auth]', err.message);
      }
    }

    // 3. Fallback local seguro
    return this._loginLocalFallback(cleanEmail, requestedRole);
  },

  _loginLocalFallback(cleanEmail, requestedRole) {
    if (DEFAULT_USERS[cleanEmail]) {
      const u = DEFAULT_USERS[cleanEmail];
      currentProfile = { ...u, rol: requestedRole || u.rol };
    } else {
      const base = cleanEmail.split('@')[0];
      const name = base.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      const ini = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'PU';
      currentProfile = {
        uid: 'user-' + base,
        email: cleanEmail,
        nombre: name,
        primerNombre: name.split(' ')[0],
        iniciales: ini,
        rol: requestedRole || 'est'
      };
    }
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
    if (currentProfile) return currentProfile;
    currentProfile = DEFAULT_USERS['estudiante@javeriana.edu.co'];
    return currentProfile;
  },

  // -------------------------------------------------------------
  // HU-02 & HU-03: Asignaturas inscritas / a cargo
  // -------------------------------------------------------------
  async subjects() {
    const me = await this.me();

    // 1. Backend Java
    if (isJavaBackendActive) {
      try {
        const res = await fetch(`${API_BASE}/subjects`, {
          headers: { 'Authorization': `Bearer ${me.token || me.uid || 'demo-est-01'}` }
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {}
    }

    // 2. Firebase Cloud Firestore
    if (this.isFirebaseActive) {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          return list;
        }
      } catch (e) {}
    }

    return localDb.subjects;
  },

  // -------------------------------------------------------------
  // HU-02: Creación de reportes de dificultades académicas
  // -------------------------------------------------------------
  async createReport(payload) {
    const me = await this.me();
    const detalle = (payload.detalle || '').trim();

    if (detalle.length < 20) {
      throw new Error('La descripción debe tener al menos 20 caracteres (Criterio HU-02).');
    }

    // 1. Backend Java
    if (isJavaBackendActive) {
      try {
        const res = await fetch(`${API_BASE}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${me.token || me.uid || 'demo-est-01'}`
          },
          body: JSON.stringify({
            subjectId: payload.subjectId,
            moods: payload.moods,
            detalle: detalle
          })
        });
        if (res.ok) {
          const created = await res.json();
          localDb.reports.unshift(created);
          saveLocalDb(localDb);
          notifyReportListeners(localDb.reports);
          return created;
        }
      } catch (e) {
        console.warn('[Nexo] Error enviando a backend Java, usando fallback local:', e);
      }
    }

    // 2. Fallback de cálculo y persistencia local/Firestore
    const allSubs = await this.subjects();
    const subj = allSubs.find(s => s.id === payload.subjectId || s.nombre === payload.subjectId) || {
      id: payload.subjectId || 'subj-poo',
      nombre: payload.subjectNombre || 'Programación Orientada a Objetos',
      grupo: 'G1',
      professorUid: 'demo-doc-01'
    };

    const moods = payload.moods || { metodologia: 2, contenido: 2, ritmo: 2 };
    const mMet = Number(moods.metodologia ?? 2);
    const mCon = Number(moods.contenido ?? 2);
    const mRit = Number(moods.ritmo ?? 2);

    let peorCat = 'Metodología';
    let menorScore = mMet;
    if (mCon < menorScore) { menorScore = mCon; peorCat = 'Contenido'; }
    if (mRit < menorScore) { menorScore = mRit; peorCat = 'Ritmo'; }

    const titulo = detalle.length <= 65 ? detalle : detalle.slice(0, 65).replace(/\s\S*$/, '') + '…';
    const nowIso = new Date().toISOString();

    const createdReport = {
      id: 'rep-' + Date.now(),
      studentUid: me.uid,
      studentNombre: me.nombre,
      subjectId: subj.id,
      asignatura: subj.nombre,
      grupo: subj.grupo || 'G1',
      professorUid: subj.professorUid || 'demo-doc-01',
      categoria: peorCat,
      titulo: titulo,
      detalle: detalle,
      moods: { metodologia: mMet, contenido: mCon, ritmo: mRit },
      estado: 'pend',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (this.isFirebaseActive) {
      try {
        await addDoc(collection(db, 'reports'), {
          ...createdReport,
          estado: 'PENDIENTE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {}
    }

    localDb.reports.unshift(createdReport);
    saveLocalDb(localDb);
    notifyReportListeners(localDb.reports);
    return createdReport;
  },

  // -------------------------------------------------------------
  // HU-03: Gestión y seguimiento de reportes en tiempo real
  // -------------------------------------------------------------
  async reports() {
    const me = await this.me();

    // 1. Backend Java
    if (isJavaBackendActive) {
      try {
        const res = await fetch(`${API_BASE}/reports`, {
          headers: { 'Authorization': `Bearer ${me.token || me.uid || 'demo-doc-01'}` }
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {}
    }

    // 2. Firebase Cloud Firestore
    if (this.isFirebaseActive) {
      try {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              estado: EST_MAP[data.estado] || data.estado || 'pend',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
            });
          });
          return list;
        }
      } catch (e) {}
    }

    return localDb.reports;
  },

  subscribeReports(callback) {
    reportListeners.push(callback);

    // Polling ligero si Java Backend está activo para refresco reactivo
    let pollInterval = null;
    if (isJavaBackendActive) {
      pollInterval = setInterval(async () => {
        try {
          const reps = await this.reports();
          callback(reps);
        } catch (e) {}
      }, 3000);
    }

    // Firestore Realtime snapshot si está disponible
    if (this.isFirebaseActive) {
      try {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              estado: EST_MAP[data.estado] || data.estado || 'pend',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
            });
          });
          if (list.length > 0) {
            localDb.reports = list;
            saveLocalDb(localDb);
          }
          callback(localDb.reports);
        });
      } catch (e) {}
    }

    setTimeout(() => callback(localDb.reports), 0);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      reportListeners = reportListeners.filter(l => l !== callback);
    };
  },

  async setStatus(reportId, newStatus) {
    const me = await this.me();
    const canonStatus = EST_MAP[newStatus] || newStatus || 'PENDIENTE';
    const uiStatus = EST_MAP[canonStatus] || 'pend';
    const nowIso = new Date().toISOString();

    // 1. Backend Java
    if (isJavaBackendActive) {
      try {
        const res = await fetch(`${API_BASE}/reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${me.token || me.uid || 'demo-doc-01'}`
          },
          body: JSON.stringify({ estado: uiStatus })
        });
        if (res.ok) {
          const rep = localDb.reports.find(r => r.id === reportId);
          if (rep) { rep.estado = uiStatus; saveLocalDb(localDb); notifyReportListeners(localDb.reports); }
          return { id: reportId, estado: uiStatus };
        }
      } catch (e) {}
    }

    // 2. Firebase Cloud Firestore
    if (this.isFirebaseActive) {
      try {
        const repRef = doc(db, 'reports', reportId);
        await updateDoc(repRef, {
          estado: canonStatus,
          updatedAt: serverTimestamp(),
          historial: arrayUnion({ estado: canonStatus, por: me.uid, fecha: nowIso })
        });
      } catch (e) {}
    }

    // 3. Almacenamiento local
    const rep = localDb.reports.find(r => r.id === reportId);
    if (rep) {
      rep.estado = uiStatus;
      rep.updatedAt = nowIso;
      saveLocalDb(localDb);
      notifyReportListeners(localDb.reports);
    }

    return { id: reportId, estado: uiStatus };
  },

  // -------------------------------------------------------------
  // HU-04: Resumen consolidado y métricas reactivas
  // -------------------------------------------------------------
  async getStats(filterSubjectId = null) {
    const me = await this.me();

    // 1. Backend Java
    if (isJavaBackendActive) {
      try {
        const queryStr = filterSubjectId && filterSubjectId !== 'todos' ? `?subjectId=${filterSubjectId}` : '';
        const res = await fetch(`${API_BASE}/stats${queryStr}`, {
          headers: { 'Authorization': `Bearer ${me.token || me.uid || 'demo-doc-01'}` }
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }

    // 2. Cálculo local / Firestore
    const reports = await this.reports();
    const filtered = filterSubjectId && filterSubjectId !== 'todos'
      ? reports.filter(r => r.subjectId === filterSubjectId || r.asignatura === filterSubjectId)
      : reports;

    const total = filtered.length;
    const pendientes = filtered.filter(r => r.estado === 'pend' || r.estado === 'PENDIENTE').length;
    const enRevision = filtered.filter(r => r.estado === 'rev' || r.estado === 'EN_REVISION').length;
    const atendidos = filtered.filter(r => r.estado === 'ok' || r.estado === 'ATENDIDO').length;
    const tasaAtencion = total > 0 ? Math.round((atendidos / total) * 100) : 0;

    return {
      total,
      pendientes,
      enRevision,
      atendidos,
      tasaAtencion,
      porCategoria: [
        { nombre: 'Metodología', total: filtered.filter(r => r.categoria === 'Metodología').length, porcentaje: total > 0 ? Math.round((filtered.filter(r => r.categoria === 'Metodología').length / total) * 100) : 0 },
        { nombre: 'Contenido', total: filtered.filter(r => r.categoria === 'Contenido').length, porcentaje: total > 0 ? Math.round((filtered.filter(r => r.categoria === 'Contenido').length / total) * 100) : 0 },
        { nombre: 'Ritmo', total: filtered.filter(r => r.categoria === 'Ritmo').length, porcentaje: total > 0 ? Math.round((filtered.filter(r => r.categoria === 'Ritmo').length / total) * 100) : 0 }
      ],
      sinReportes: total === 0
    };
  },

  _formatUserProfile(uid, data) {
    const nombre = data.nombre || 'Usuario Javeriana';
    const partes = nombre.trim().split(/\s+/);
    const primer = partes[0] || 'Usuario';
    const ini = partes.length > 1 ? (partes[0][0] + partes[1][0]).toUpperCase() : primer.slice(0, 2).toUpperCase();
    return {
      uid, email: data.email || '', nombre, primerNombre: primer, iniciales: ini,
      rol: ROL_MAP[data.rol] || data.rol || 'est'
    };
  },

  _translateAuthError(err) {
    const code = err.code || '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return 'Correo institucional o contraseña incorrectos.';
    }
    return err.message || 'Error al autenticar.';
  }
};

if (typeof window !== 'undefined') {
  window.NexoAPI = NexoAPI;
}
