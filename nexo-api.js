/*
 * Conexión directa a Firebase Authentication y Cloud Firestore.
 * Funciona 100% en el plan gratuito Spark (sin necesidad de Cloud Functions ni facturación).
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

const enabled = !!FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('TU_');
const app = enabled ? initializeApp(FIREBASE_CONFIG) : null;
const auth = enabled ? getAuth(app) : null;
const db = enabled ? getFirestore(app) : null;

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.'
};

const ROL_MAP = {
  ESTUDIANTE: 'est',
  DOCENTE: 'doc',
  DIRECCION: 'dir',
  ADMIN: 'adm'
};

const EST_MAP = {
  PENDIENTE: 'pend',
  EN_REVISION: 'rev',
  ATENDIDO: 'ok',
  pend: 'PENDIENTE',
  rev: 'EN_REVISION',
  ok: 'ATENDIDO'
};

let cachedProfile = null;

async function getProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Tu cuenta no tiene un perfil registrado en Nexo.');
  }
  const d = snap.data();
  const nombre = d.nombre || user.displayName || 'Usuario';
  const partes = nombre.trim().split(/\s+/);
  const ini = partes.length > 1
    ? (partes[0][0] + partes[1][0]).toUpperCase()
    : partes[0].slice(0, 2).toUpperCase();

  cachedProfile = {
    uid: user.uid,
    email: user.email,
    nombre: nombre,
    primerNombre: partes[0],
    iniciales: ini,
    rol: ROL_MAP[d.rol] || d.rol || 'est'
  };
  return cachedProfile;
}

window.NexoAPI = {
  enabled,

  async login(email, password) {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw new Error(AUTH_ERRORS[e.code] || 'Error al iniciar sesión: ' + e.message);
    }
    return await getProfile(cred.user);
  },

  async logout() {
    cachedProfile = null;
    if (auth) await signOut(auth);
  },

  async resetPassword(email) {
    if (auth) await sendPasswordResetEmail(auth, email.trim());
  },

  async me() {
    if (!auth?.currentUser) throw new Error('Debes iniciar sesión');
    if (cachedProfile) return cachedProfile;
    return await getProfile(auth.currentUser);
  },

  async subjects() {
    const me = await this.me();
    let q;
    if (me.rol === 'est') {
      q = query(collection(db, 'subjects'), where('studentUids', 'array-contains', me.uid));
    } else if (me.rol === 'doc') {
      q = query(collection(db, 'subjects'), where('professorUid', '==', me.uid));
    } else {
      q = query(collection(db, 'subjects'));
    }

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nombre: data.nombre,
        abreviatura: data.abreviatura,
        profesor: data.professorNombre,
        grupo: data.grupo
      };
    });
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async reports() {
    const me = await this.me();
    let q;
    if (me.rol === 'est') {
      q = query(collection(db, 'reports'), where('studentUid', '==', me.uid));
    } else if (me.rol === 'doc') {
      q = query(collection(db, 'reports'), where('professorUid', '==', me.uid));
    } else {
      q = query(collection(db, 'reports'));
    }

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
      const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : created;
      return {
        id: d.id,
        subjectId: data.subjectId,
        asignatura: data.subjectNombre,
        grupo: data.grupo,
        categoria: data.categoria,
        titulo: data.titulo,
        detalle: data.detalle,
        moods: data.moods || { metodologia: 2, contenido: 2, ritmo: 2 },
        estado: EST_MAP[data.estado] || 'pend',
        createdAt: created,
        updatedAt: updated
      };
    });

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createReport(payload) {
    const me = await this.me();
    if (me.rol !== 'est') throw new Error('Solo los estudiantes pueden crear reportes.');

    const subDoc = await getDoc(doc(db, 'subjects', payload.subjectId));
    if (!subDoc.exists()) throw new Error('La asignatura no existe.');
    const subData = subDoc.data();

    const m = payload.moods || {};
    const met = m.metodologia ?? 2, con = m.contenido ?? 2, rit = m.ritmo ?? 2;
    const cats = ['Metodología', 'Contenido', 'Ritmo'];
    const scores = [met, con, rit];
    let peor = 0;
    for (let i = 1; i < scores.length; i++) if (scores[i] < scores[peor]) peor = i;

    const detalle = (payload.detalle || '').trim();
    const titulo = detalle.length <= 60 ? detalle : detalle.slice(0, 60).replace(/\s\S*$/, '') + '…';

    const docData = {
      studentUid: me.uid,
      subjectId: payload.subjectId,
      subjectNombre: subData.nombre,
      grupo: subData.grupo,
      professorUid: subData.professorUid,
      moods: { metodologia: met, contenido: con, ritmo: rit },
      comentarios: payload.comments || {},
      categoria: cats[peor],
      titulo: titulo,
      detalle: detalle,
      estado: 'PENDIENTE',
      historial: [{ estado: 'PENDIENTE', por: me.uid, fecha: new Date() }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ref = await addDoc(collection(db, 'reports'), docData);
    return { id: ref.id, createdAt: new Date().toISOString() };
  },

  async setStatus(id, estado) {
    const me = await this.me();
    if (me.rol !== 'doc' && me.rol !== 'adm') throw new Error('Solo los docentes pueden cambiar el estado.');

    const ref = doc(db, 'reports', id);
    const estadoDb = EST_MAP[estado] || 'PENDIENTE';
    await updateDoc(ref, {
      estado: estadoDb,
      updatedAt: serverTimestamp(),
      historial: arrayUnion({ estado: estadoDb, por: me.uid, fecha: new Date() })
    });
    return { ok: true };
  },

  async stats() {
    const [subs, reps] = await Promise.all([this.subjects(), this.reports()]);
    const T = reps.length;
    const p = reps.filter((r) => r.estado === 'pend').length;
    const rev = reps.filter((r) => r.estado === 'rev').length;
    const ok = reps.filter((r) => r.estado === 'ok').length;

    const cats = ['Metodología', 'Contenido', 'Ritmo'].map((c) => {
      const n = reps.filter((r) => r.categoria === c).length;
      return { nombre: c, total: n, porcentaje: T ? Math.round((n / T) * 100) : 0 };
    });

    const avg = (f) => {
      if (!T) return 3.0;
      const s = reps.reduce((acc, r) => acc + (f(r) + 1), 0);
      return Math.round((s / T) * 10) / 10;
    };

    const valoraciones = [
      { nombre: 'Metodología', promedio: avg((r) => r.moods.metodologia) },
      { nombre: 'Contenido', promedio: avg((r) => r.moods.contenido) },
      { nombre: 'Ritmo', promedio: avg((r) => r.moods.ritmo) }
    ];

    const weeks = [
      { semana: 'S1', total: 0 },
      { semana: 'S2', total: 0 },
      { semana: 'S3', total: 0 },
      { semana: 'S4', total: 0 },
      { semana: 'S5', total: 0 },
      { semana: 'S6', total: T }
    ];

    const materias = {};
    subs.forEach((s) => {
      const delGrupo = reps.filter((r) => r.subjectId === s.id || (r.asignatura === s.nombre && r.grupo === s.grupo));
      if (!materias[s.nombre]) {
        materias[s.nombre] = {
          nombre: s.nombre,
          abreviatura: s.abreviatura,
          pendientes: 0,
          enRevision: 0,
          atendidos: 0,
          grupos: []
        };
      }
      const pe = delGrupo.filter((r) => r.estado === 'pend').length;
      const re = delGrupo.filter((r) => r.estado === 'rev').length;
      const at = delGrupo.filter((r) => r.estado === 'ok').length;
      materias[s.nombre].pendientes += pe;
      materias[s.nombre].enRevision += re;
      materias[s.nombre].atendidos += at;
      materias[s.nombre].grupos.push({
        subjectId: s.id,
        grupo: s.grupo,
        profesor: s.profesor,
        total: delGrupo.length,
        pendientes: pe
      });
    });

    return {
      total: T,
      pendientes: p,
      enRevision: rev,
      atendidos: ok,
      porCategoria: cats,
      valoraciones: valoraciones,
      porSemana: weeks,
      porAsignatura: Object.values(materias)
    };
  }
};
