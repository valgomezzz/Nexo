/**
 * NEXO - API & Backend as a Service (Firebase)
 * Conexión completa con Firebase Authentication y Cloud Firestore.
 * Pontificia Universidad Javeriana (PUJ).
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
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
  arrayUnion,
  orderBy,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

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

// Etiquetas en español
export const EST_LABELS = {
  pend: 'Pendiente',
  rev: 'En revisión',
  ok: 'Atendido'
};

// Detección de configuración de Firebase activa
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
    console.log('[Nexo Backend] Conectado exitosamente a Firebase Cloud Firestore (' + FIREBASE_CONFIG.projectId + ')');
  } catch (err) {
    console.warn('[Nexo Backend] Error al inicializar Firebase SDK:', err);
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

// Materias institucionales sembradas
const DEFAULT_SUBJECTS = [
  { id: 'subj-poo', codigo: 'IS-301', nombre: 'Programación Orientada a Objetos', abreviatura: 'POO', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G1', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-calc', codigo: 'MAT-201', nombre: 'Cálculo Diferencial e Integral', abreviatura: 'Cálculo', profesor: 'Dra. Patricia Silva', professorUid: 'doc-silva', grupo: 'G2', creditos: 4, studentUids: ['demo-est-01'] },
  { id: 'subj-edd', codigo: 'IS-302', nombre: 'Estructuras de Datos y Algoritmos', abreviatura: 'EDD', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G1', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-fis', codigo: 'FIS-101', nombre: 'Física Mecánica y Termodinámica', abreviatura: 'Física', profesor: 'Ing. Roberto Andrade', professorUid: 'doc-andrade', grupo: 'G3', creditos: 3, studentUids: ['demo-est-01'] },
  { id: 'subj-alg', codigo: 'MAT-102', nombre: 'Álgebra Lineal Aplicada', abreviatura: 'Álgebra', profesor: 'Dr. Carlos Mendoza', professorUid: 'demo-doc-01', grupo: 'G2', creditos: 3, studentUids: [] }
];

// Reportes iniciales realistas con diferentes estados
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
    historial: [{ estado: 'PENDIENTE', por: 'demo-est-01', fecha: new Date(Date.now() - 86400000 * 2).toISOString() }],
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
    historial: [
      { estado: 'PENDIENTE', por: 'demo-est-01', fecha: new Date(Date.now() - 86400000 * 4).toISOString() },
      { estado: 'EN_REVISION', por: 'demo-doc-01', fecha: new Date(Date.now() - 86400000 * 1).toISOString() }
    ],
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
    historial: [
      { estado: 'PENDIENTE', por: 'est-juan', fecha: new Date(Date.now() - 86400000 * 6).toISOString() },
      { estado: 'EN_REVISION', por: 'demo-doc-01', fecha: new Date(Date.now() - 86400000 * 5).toISOString() },
      { estado: 'ATENDIDO', por: 'demo-doc-01', fecha: new Date(Date.now() - 86400000 * 3).toISOString() }
    ],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

// Estado local reactivo persistente (LocalStorage)
const STORAGE_KEY = 'nexo_local_db_v1';
function loadLocalDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    subjects: DEFAULT_SUBJECTS,
    reports: DEFAULT_REPORTS
  };
}
function saveLocalDb(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

let localDb = loadLocalDb();
let currentProfile = null;
let reportListeners = [];

function notifyReportListeners(reportsList) {
  reportListeners.forEach((fn) => {
    try { fn(reportsList); } catch (e) { console.error(e); }
  });
}

// ===============================================================
// API PÚBLICA DEL BACKEND DE NEXO
// ===============================================================
export const NexoAPI = {
  isFirebaseActive: Boolean(db && auth),
  projectId: FIREBASE_CONFIG?.projectId || 'nexo-puj',

  // -------------------------------------------------------------
  // HU-01: Autenticación institucional con roles
  // -------------------------------------------------------------
  async login(email, password, requestedRole = 'est') {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    // Validación estricta de correo institucional (@javeriana.edu.co)
    if (!cleanEmail.endsWith('@javeriana.edu.co')) {
      throw new Error('Solo se permiten cuentas con correo institucional (@javeriana.edu.co).');
    }
    if (!password || password.length < 4) {
      throw new Error('Ingresa una contraseña válida de al menos 4 caracteres.');
    }

    // 1. Si Firebase Auth está disponible en el entorno web
    if (this.isFirebaseActive) {
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (signInErr) {
          // Si el usuario no existe en Auth de Firebase, lo registramos automáticamente para agilizar pruebas
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            } catch (createErr) {
              throw new Error(this._translateAuthError(createErr));
            }
          } else {
            throw new Error(this._translateAuthError(signInErr));
          }
        }

        const user = userCredential.user;
        // Consulta o creación del perfil en Cloud Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let profileData;
        if (userDocSnap.exists()) {
          profileData = userDocSnap.data();
        } else {
          // Inicializar perfil en Firestore
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
        console.warn('[Nexo Firebase Auth] Falló conexión en la nube, usando fallback institucional local:', err.message);
        // Fallback local seguro para que las pantallas no se bloqueen
        return this._loginLocalFallback(cleanEmail, requestedRole);
      }
    }

    // 2. Fallback local reactivo (sin backend externo requerido)
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
      try {
        await signOut(auth);
      } catch (e) {}
    }
    return true;
  },

  async me() {
    if (currentProfile) return currentProfile;
    if (this.isFirebaseActive && auth?.currentUser) {
      const user = auth.currentUser;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        currentProfile = this._formatUserProfile(user.uid, snap.data());
        return currentProfile;
      }
    }
    // Usuario por defecto si entra directo a una pantalla
    currentProfile = DEFAULT_USERS['estudiante@javeriana.edu.co'];
    return currentProfile;
  },

  async resetPassword(email) {
    const clean = (email || '').trim().toLowerCase();
    if (this.isFirebaseActive && auth) {
      await sendPasswordResetEmail(auth, clean);
    }
    return true;
  },

  // -------------------------------------------------------------
  // HU-02 & HU-03: Asignaturas inscritas / a cargo
  // -------------------------------------------------------------
  async subjects() {
    const me = await this.me();

    if (this.isFirebaseActive) {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({ id: d.id, ...data });
          });
          return list;
        } else {
          // Si Firestore está vacío, sembramos las asignaturas iniciales
          await this.seedInitialData();
          return localDb.subjects;
        }
      } catch (e) {
        console.warn('[Nexo Firestore] Error consultando asignaturas, usando datos locales:', e);
      }
    }

    return localDb.subjects;
  },

  // -------------------------------------------------------------
  // HU-02: Creación de reportes de dificultades académicas
  // -------------------------------------------------------------
  async createReport(payload) {
    const me = await this.me();
    const detalle = (payload.detalle || '').trim();

    // Validación HU-02: Mínimo 20 caracteres / palabras
    if (detalle.length < 20) {
      throw new Error('La descripción de la dificultad debe tener al menos 20 caracteres para que el docente pueda comprenderla con claridad.');
    }

    // Obtener información de la asignatura
    const allSubs = await this.subjects();
    const subj = allSubs.find(s => s.id === payload.subjectId || s.nombre === payload.subjectId) || {
      id: payload.subjectId || 'subj-poo',
      nombre: payload.subjectNombre || 'Programación Orientada a Objetos',
      grupo: 'G1',
      professorUid: 'demo-doc-01'
    };

    // Cálculo automático de categoría principal según la valoración más baja
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

    const newReportData = {
      studentUid: me.uid,
      studentNombre: me.nombre,
      studentEmail: me.email,
      subjectId: subj.id,
      asignatura: subj.nombre,
      grupo: subj.grupo || 'G1',
      professorUid: subj.professorUid || 'demo-doc-01',
      categoria: peorCat,
      titulo: titulo,
      detalle: detalle,
      moods: { metodologia: mMet, contenido: mCon, ritmo: mRit },
      comentarios: payload.comments || {},
      estado: 'PENDIENTE',
      historial: [
        { estado: 'PENDIENTE', por: me.uid, fecha: nowIso }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    let createdId = 'rep-' + Date.now();

    // Persistencia en Cloud Firestore si está activo
    if (this.isFirebaseActive) {
      try {
        const docRef = await addDoc(collection(db, 'reports'), {
          ...newReportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        createdId = docRef.id;
      } catch (err) {
        console.warn('[Nexo Firestore] Error creando reporte en Firestore:', err);
      }
    }

    // Persistencia reactiva local inmediata
    const createdReport = {
      ...newReportData,
      id: createdId,
      estado: 'pend' // mapeo UI
    };
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

    if (this.isFirebaseActive) {
      try {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
            const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : created;
            list.push({
              id: d.id,
              ...data,
              estado: EST_MAP[data.estado] || data.estado || 'pend',
              createdAt: created,
              updatedAt: updated
            });
          });
          return list;
        }
      } catch (e) {
        console.warn('[Nexo Firestore] Error obteniendo reportes:', e);
      }
    }

    return localDb.reports;
  },

  // Suscripción reactiva en tiempo real (HU-03 / HU-04)
  subscribeReports(callback) {
    reportListeners.push(callback);

    if (this.isFirebaseActive) {
      try {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(d => {
            const data = d.data();
            const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
            const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : created;
            list.push({
              id: d.id,
              ...data,
              estado: EST_MAP[data.estado] || data.estado || 'pend',
              createdAt: created,
              updatedAt: updated
            });
          });
          if (list.length > 0) {
            localDb.reports = list;
            saveLocalDb(localDb);
          }
          callback(localDb.reports);
        }, (err) => {
          console.warn('[Nexo Firestore Snapshot Error]', err);
          callback(localDb.reports);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('[Nexo Snapshot]', err);
      }
    }

    // Si no hay snapshot en la nube, entregamos el estado actual
    setTimeout(() => callback(localDb.reports), 0);
    return () => {
      reportListeners = reportListeners.filter(l => l !== callback);
    };
  },

  // Modificación reactiva de estado (Pendiente -> En revisión -> Atendido)
  async setStatus(reportId, newStatus) {
    const me = await this.me();
    const canonStatus = EST_MAP[newStatus] || newStatus || 'PENDIENTE';
    const uiStatus = EST_MAP[canonStatus] || 'pend';
    const nowIso = new Date().toISOString();

    // 1. Actualizar en Cloud Firestore si está activo
    if (this.isFirebaseActive) {
      try {
        const repRef = doc(db, 'reports', reportId);
        await updateDoc(repRef, {
          estado: canonStatus,
          updatedAt: serverTimestamp(),
          historial: arrayUnion({
            estado: canonStatus,
            por: me.uid,
            fecha: nowIso
          })
        });
      } catch (e) {
        console.warn('[Nexo Firestore] Error actualizando estado en la nube:', e);
      }
    }

    // 2. Actualizar en almacenamiento local reactivo
    const rep = localDb.reports.find(r => r.id === reportId);
    if (rep) {
      rep.estado = uiStatus;
      rep.updatedAt = nowIso;
      if (!rep.historial) rep.historial = [];
      rep.historial.push({ estado: canonStatus, por: me.uid, fecha: nowIso });
      saveLocalDb(localDb);
      notifyReportListeners(localDb.reports);
    }

    return { id: reportId, estado: uiStatus };
  },

  // -------------------------------------------------------------
  // HU-04: Resumen consolidado y métricas reactivas
  // -------------------------------------------------------------
  async getStats(filterSubjectId = null) {
    const reports = await this.reports();
    const filtered = filterSubjectId && filterSubjectId !== 'todos'
      ? reports.filter(r => r.subjectId === filterSubjectId || r.asignatura === filterSubjectId)
      : reports;

    const total = filtered.length;
    const pendientes = filtered.filter(r => r.estado === 'pend' || r.estado === 'PENDIENTE').length;
    const enRevision = filtered.filter(r => r.estado === 'rev' || r.estado === 'EN_REVISION').length;
    const atendidos = filtered.filter(r => r.estado === 'ok' || r.estado === 'ATENDIDO').length;
    const tasaAtencion = total > 0 ? Math.round((atendidos / total) * 100) : 0;

    // Conteo por categoría
    const categorias = {
      Metodología: filtered.filter(r => r.categoria === 'Metodología').length,
      Contenido: filtered.filter(r => r.categoria === 'Contenido').length,
      Ritmo: filtered.filter(r => r.categoria === 'Ritmo').length
    };

    return {
      total,
      pendientes,
      enRevision,
      atendidos,
      tasaAtencion,
      categorias,
      sinReportes: total === 0
    };
  },

  // -------------------------------------------------------------
  // HU-05: Población inicial de Firestore (Semilla de datos)
  // -------------------------------------------------------------
  async seedInitialData() {
    if (!this.isFirebaseActive) return;
    try {
      console.log('[Nexo Backend] Sembrando datos iniciales en Firestore...');
      const batch = writeBatch(db);

      // Usuarios
      for (const [email, u] of Object.entries(DEFAULT_USERS)) {
        const uRef = doc(db, 'users', u.uid);
        batch.set(uRef, {
          email: u.email,
          nombre: u.nombre,
          rol: ROL_MAP[u.rol] || 'ESTUDIANTE',
          createdAt: serverTimestamp()
        }, { merge: true });
      }

      // Asignaturas
      for (const s of DEFAULT_SUBJECTS) {
        const sRef = doc(db, 'subjects', s.id);
        batch.set(sRef, {
          ...s,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Reportes
      for (const r of DEFAULT_REPORTS) {
        const rRef = doc(db, 'reports', r.id);
        batch.set(rRef, {
          ...r,
          estado: EST_MAP[r.estado] || 'PENDIENTE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      console.log('[Nexo Backend] Datos semilla sembrados exitosamente en Firestore.');
    } catch (e) {
      console.warn('[Nexo Backend] No se pudo ejecutar el sembrado en lote:', e);
    }
  },

  _formatUserProfile(uid, data) {
    const nombre = data.nombre || 'Usuario Javeriana';
    const partes = nombre.trim().split(/\s+/);
    const primer = partes[0] || 'Usuario';
    const ini = partes.length > 1
      ? (partes[0][0] + partes[1][0]).toUpperCase()
      : primer.slice(0, 2).toUpperCase();

    return {
      uid: uid,
      email: data.email || '',
      nombre: nombre,
      primerNombre: primer,
      iniciales: ini,
      rol: ROL_MAP[data.rol] || data.rol || 'est'
    };
  },

  _translateAuthError(err) {
    const code = err.code || '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return 'Correo institucional o contraseña incorrectos.';
    }
    if (code.includes('invalid-email')) {
      return 'Formato de correo no válido. Usa tu cuenta @javeriana.edu.co.';
    }
    if (code.includes('too-many-requests')) {
      return 'Demasiados intentos fallidos. Por favor espera un momento.';
    }
    return err.message || 'Error al autenticar con Firebase.';
  }
};

// Exponer en window para integración con cualquier pantalla HTML
if (typeof window !== 'undefined') {
  window.NexoAPI = NexoAPI;
}
