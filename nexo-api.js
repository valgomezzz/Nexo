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
  signOut,
  OAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
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
import { FIREBASE_CONFIG, API_BASE, EMAILJS, MICROSOFT } from './firebase-config.js?v=20261108';

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
// Cada pregunta tiene un tipo de respuesta:
//   likert → 0-4 (Totalmente en desacuerdo … Totalmente de acuerdo), se responde con caritas.
//            Solo para percepciones, donde importa el grado.
//   sino   → true / false. Para hechos que ocurrieron o no.
//   opcion → índice de "opciones". Para respuestas categóricas (carga, horas, …).
// "puntaje" lleva cada respuesta a la escala 0-4 para calcular la valoración de la
// categoría (null = no cuenta). "alerta" marca la respuesta que dirección debe revisar.
export const FORM_VERSION = 2;
export const LIKERT_LABELS = ['Totalmente en desacuerdo', 'En desacuerdo', 'Ni de acuerdo ni en desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'];
export const SI_NO = { true: 'Sí', false: 'No' };

export const CATEGORIAS = [
  {
    key: 'claridad', nombre: 'Claridad', titulo: 'Claridad y organización del curso', frase: 'la claridad del curso',
    help: 'Piensa en los objetivos de la materia y en cómo se ordenaron los temas.',
    preguntas: [
      { id: 'p1', tipo: 'sino', corto: 'Presentó objetivos y forma de evaluar', q: '¿Al inicio del curso, el docente presentó los objetivos de la materia y cómo se iba a evaluar?' },
      { id: 'p2', tipo: 'likert', corto: 'Orden de los temas', q: 'Los temas se presentaron en un orden que me permitió entender cómo se conectaban entre sí.' }
    ]
  },
  {
    key: 'explicaciones', nombre: 'Explicaciones', titulo: 'Calidad de las explicaciones', frase: 'las explicaciones',
    help: 'Piensa en cómo el docente explica en clase y en los ejemplos que usa.',
    preguntas: [
      { id: 'p3', tipo: 'likert', corto: 'Explicaciones comprensibles', q: 'Las explicaciones del docente me ayudaron a comprender los contenidos.' },
      { id: 'p4', tipo: 'likert', corto: 'Ejemplos y actividades útiles', q: 'El docente usó ejemplos o actividades que facilitaron mi aprendizaje.' }
    ]
  },
  {
    key: 'evaluacion', nombre: 'Evaluación', titulo: 'Evaluación y retroalimentación', frase: 'la evaluación',
    help: 'Piensa en los parciales, trabajos y talleres, y en los comentarios que recibiste.',
    preguntas: [
      { id: 'p5', tipo: 'likert', corto: 'Evaluaciones acordes al curso', q: 'Las evaluaciones (parciales, trabajos, talleres) correspondieron con lo trabajado en el curso.' },
      { id: 'p6', tipo: 'sino', corto: 'Criterios claros antes de evaluar', q: '¿Conociste los criterios de calificación antes de cada evaluación?' },
      { id: 'p7', tipo: 'sino', corto: 'Retroalimentación más allá de la nota', q: '¿Recibiste retroalimentación, además de la nota, que te indicara cómo mejorar?' }
    ]
  },
  {
    key: 'acompanamiento', nombre: 'Acompañamiento', titulo: 'Acompañamiento y relación con los estudiantes', frase: 'el acompañamiento',
    help: 'Piensa en la disposición del docente para ayudarte y en el ambiente de la clase.',
    preguntas: [
      { id: 'p8', tipo: 'opcion', corto: 'Obtuvo ayuda con sus dudas', q: 'Cuando tuviste dudas, ¿pudiste obtener ayuda del docente?',
        opciones: ['Sí, siempre', 'A veces', 'No', 'No tuve dudas'], puntaje: [4, 2, 0, null], colores: ['#355E96', '#E6B979', '#B3403A', '#C5D3E8'] },
      { id: 'p9', tipo: 'likert', corto: 'Promueve la participación', q: 'El docente promovió la participación y las preguntas en clase.' },
      { id: 'p10', tipo: 'sino', corto: 'Trato respetuoso', q: '¿El docente trató a los estudiantes con respeto?', alerta: false }
    ]
  }
];

// Datos de contexto: no se promedian en la valoración del docente.
export const CONTEXTO = [
  { id: 'carga', tipo: 'opcion', corto: 'Carga de trabajo', q: '¿Cómo fue la carga de trabajo de esta materia?',
    opciones: ['Baja', 'Adecuada', 'Alta', 'Excesiva'], colores: ['#9DB6DA', '#355E96', '#E6B979', '#B3403A'] },
  { id: 'dificultad', tipo: 'opcion', corto: 'Nivel de dificultad', q: '¿Cómo fue el nivel de dificultad?',
    opciones: ['Fácil', 'Adecuado', 'Difícil', 'Muy difícil'], colores: ['#9DB6DA', '#355E96', '#E6B979', '#B3403A'] },
  { id: 'horas', tipo: 'opcion', corto: 'Horas semanales fuera de clase', q: '¿Cuántas horas a la semana dedicaste a esta materia fuera de clase?',
    opciones: ['0–2 h', '3–5 h', '6–8 h', '9 h o más'], colores: ['#DCE5F2', '#9DB6DA', '#5E7FAF', '#2C4F80'] },
  { id: 'p13', tipo: 'likert', corto: 'Siente que aprendió', q: 'Siento que aprendí mucho en esta materia.' },
  { id: 'p14', tipo: 'likert', corto: 'Satisfacción general', q: 'En general, estoy satisfecho/a con esta materia.' },
  { id: 'recomienda', tipo: 'sino', corto: 'Recomendaría la materia', q: '¿Le recomendarías esta materia, con este docente, a otro estudiante?' }
];

// Numeración consecutiva de todas las preguntas cerradas
export const PREGUNTAS = [...CATEGORIAS.flatMap(c => c.preguntas), ...CONTEXTO];
PREGUNTAS.forEach((p, i) => { p.n = i + 1; });
export const PREGUNTA = Object.fromEntries(PREGUNTAS.map(p => [p.id, p]));

/** Texto legible de una respuesta. */
export function textoRespuesta(p, v) {
  if (v === null || v === undefined) return '—';
  if (p.tipo === 'likert') return LIKERT_LABELS[v] ?? '—';
  if (p.tipo === 'sino') return SI_NO[v] ?? '—';
  return p.opciones[v] ?? '—';
}

/** Respuesta llevada a la escala 0-4 (null = no cuenta). */
export function puntaje(p, v) {
  if (p.tipo === 'likert') return Number.isInteger(v) && v >= 0 && v <= 4 ? v : null;
  if (p.tipo === 'sino') return v === true ? 4 : v === false ? 0 : null;
  return Number.isInteger(v) ? (p.puntaje?.[v] ?? null) : null;
}

/** true si la respuesta es la marcada como alerta en la pregunta. */
export const esAlerta = (p, v) => p.alerta !== undefined && v === p.alerta;

/** Preguntas con respuesta de alerta en un reporte. */
export const alertasDe = (r) => PREGUNTAS.filter(p => esAlerta(p, r.respuestas?.[p.id]));

/** Promedio 0-4 de una categoría. null si no hay respuestas que cuenten. */
export function promedioCategoria(respuestas, cat) {
  const vals = cat.preguntas.map(p => puntaje(p, respuestas?.[p.id])).filter(v => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** % de respuestas favorables (puntaje ≥ 3) de una categoría en una lista de reportes. */
export function favorableCategoria(reports, cat) {
  const vals = reports.flatMap(r => cat.preguntas.map(p => puntaje(p, r.respuestas?.[p.id]))).filter(v => v !== null);
  return vals.length ? { pct: Math.round(vals.filter(v => v >= 3).length * 100 / vals.length), n: vals.length } : { pct: null, n: 0 };
}

/**
 * Resumen de una pregunta sobre una lista de reportes:
 *   conteos por respuesta (en el orden de la escala), total respondido y titular.
 */
export function resumenPregunta(p, reports) {
  const vals = reports.map(r => r.respuestas?.[p.id]).filter(v => v !== null && v !== undefined);
  let labels, keys, colores;
  if (p.tipo === 'likert') {
    labels = LIKERT_LABELS; keys = [0, 1, 2, 3, 4];
    colores = ['#B3403A', '#E09A62', '#C5D3E8', '#7FA0CF', '#355E96'];
  } else if (p.tipo === 'sino') {
    labels = ['Sí', 'No']; keys = [true, false];
    colores = ['#355E96', '#B3403A'];
  } else {
    labels = p.opciones; keys = p.opciones.map((_, i) => i);
    colores = p.colores || ['#355E96', '#7FA0CF', '#E6B979', '#B3403A', '#C5D3E8'];
  }
  const n = vals.length;
  const partes = keys.map((k, i) => {
    const c = vals.filter(v => v === k).length;
    return { label: labels[i], n: c, pct: n ? Math.round(c * 100 / n) : 0, color: colores[i], alerta: esAlerta(p, k) };
  });
  let titular = null;
  if (n) {
    if (p.tipo === 'likert') {
      const pct = Math.round(vals.filter(v => v >= 3).length * 100 / n);
      titular = { valor: `${pct} %`, texto: 'de acuerdo', pct };
    } else if (p.tipo === 'sino') {
      titular = { valor: `${partes[0].pct} %`, texto: 'dijo que sí', pct: partes[0].pct };
    } else {
      const top = [...partes].sort((a, b) => b.n - a.n)[0];
      titular = { valor: `${top.pct} %`, texto: top.label.toLowerCase(), pct: null };
    }
  }
  return { n, partes, titular, alertas: partes.filter(x => x.alerta).reduce((a, x) => a + x.n, 0) };
}

/**
 * Reportes hechos con el formulario anterior (todo en escala de acuerdo 0-4):
 * se convierten a los tipos actuales para poder resumirlos juntos.
 */
function migrarRespuestas(R) {
  if (!R || R.p1 === undefined) return R || {};
  const out = { ...R };
  const sino = (v) => (Number.isInteger(v) ? (v >= 3 ? true : v <= 1 ? false : null) : null);
  for (const id of ['p1', 'p6', 'p7', 'p10']) out[id] = sino(R[id]);
  out.p8 = Number.isInteger(R.p8) ? (R.p8 >= 3 ? 0 : R.p8 === 2 ? 1 : 2) : null;
  // "La carga / dificultad fue adecuada": de acuerdo → Adecuada, en desacuerdo → Alta / Difícil
  out.carga = Number.isInteger(R.carga) ? (R.carga >= 3 ? 1 : R.carga <= 1 ? 2 : null) : null;
  out.dificultad = Number.isInteger(R.dificultad) ? (R.dificultad >= 3 ? 1 : R.dificultad <= 1 ? 2 : null) : null;
  out.recomienda = null;
  return out;
}

// ---------------------------------------------------------------
// Temas de los comentarios (por palabras clave), para identificarlos y filtrarlos
// ---------------------------------------------------------------
export const TEMAS = [
  { key: 'ritmo', nombre: 'Ritmo de la clase', palabras: ['ritmo', 'rapido', 'muy rapido', 'lento', 'velocidad', 'no alcanzo', 'acelerad', 'apurad'] },
  { key: 'explicaciones', nombre: 'Explicaciones', palabras: ['explica', 'ejemplo', 'entiend', 'entend', 'confus', 'claro', 'claridad', 'comprend'] },
  { key: 'evaluacion', nombre: 'Evaluaciones', palabras: ['parcial', 'examen', 'quiz', 'evalua', 'calific', 'nota', 'rubrica', 'criterio'] },
  { key: 'retro', nombre: 'Retroalimentación', palabras: ['retroaliment', 'feedback', 'correcc', 'corrig', 'devuelv', 'solo la nota'] },
  { key: 'carga', nombre: 'Carga de trabajo', palabras: ['carga', 'tarea', 'taller', 'extens', 'mucho trabajo', 'demasiad', 'entrega', 'proyecto'] },
  { key: 'material', nombre: 'Material y recursos', palabras: ['material', 'diapositiva', 'slides', 'presentacion', 'guia', 'lectura', 'libro', 'recurso', 'video', 'apuntes'] },
  { key: 'acompanamiento', nombre: 'Asesorías y apoyo', palabras: ['asesor', 'tutor', 'monitor', 'atencion', 'dudas', 'ayuda', 'disponib', 'respond', 'correo'] },
  { key: 'trato', nombre: 'Trato y ambiente', palabras: ['respeto', 'irrespet', 'trato', 'grosero', 'ambiente', 'humill', 'grit', 'amable', 'paciencia'] },
  { key: 'organizacion', nombre: 'Organización', palabras: ['organiz', 'cronograma', 'programa', 'orden', 'planea', 'horario', 'puntual', 'cancel'] },
  { key: 'practica', nombre: 'Práctica y laboratorios', palabras: ['practic', 'laboratorio', 'ejercicio', 'codigo', 'caso real', 'casos reales', 'grupo'] }
];
const sinTildes = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Claves de los temas que menciona un comentario (vacío si ninguno). */
export function temasDe(texto) {
  const t = sinTildes(texto);
  return TEMAS.filter(tm => tm.palabras.some(w => t.includes(w))).map(tm => tm.key);
}
export { sinTildes };

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
    // Respuestas del formulario por pregunta (ver PREGUNTAS); las del formulario anterior se migran
    respuestas: r.respuestas && typeof r.respuestas === 'object' ? (r.formVersion === FORM_VERSION ? r.respuestas : migrarRespuestas(r.respuestas)) : {},
    formVersion: r.formVersion || 1,
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
  if (code.includes('email-already-in-use')) return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Correo institucional o contraseña incorrectos. Si aún no tienes cuenta, regístrate.';
  }
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('too-many-requests')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (code.includes('network')) return 'Sin conexión con Firebase. Revisa tu internet.';
  return err.message || 'No fue posible iniciar sesión.';
}

function translateMicrosoftError(err) {
  const code = err.code || '';
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return 'Cerraste la ventana de Microsoft antes de terminar.';
  if (code.includes('popup-blocked')) return 'El navegador bloqueó la ventana de Microsoft. Permite ventanas emergentes para este sitio e inténtalo de nuevo.';
  if (code.includes('account-exists-with-different-credential')) return 'Este correo ya tiene una cuenta con contraseña. Inicia sesión con tu contraseña.';
  if (code.includes('operation-not-allowed')) return 'El inicio con Microsoft no está activado en Firebase (Authentication → Proveedores).';
  if (code.includes('unauthorized-domain')) return 'Este sitio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).';
  if (code.includes('network')) return 'Sin conexión. Revisa tu internet.';
  return 'No fue posible iniciar sesión con Microsoft. ' + (err.message || '');
}

const INSTITUTIONAL = /^[^@\s]+@javeriana\.edu\.co$/;

// ---------------------------------------------------------------
// Verificación del correo con código de 6 dígitos (todo en el navegador).
// El código se genera aquí y se envía con EmailJS (configurado en firebase-config.js).
// La cuenta queda verificada cuando existe su perfil en users/{uid}: el perfil solo se
// crea al escribir el código correcto.
// ---------------------------------------------------------------
const CODE_TTL_MS = 10 * 60_000;
const RESEND_MS = 60_000;
const MAX_TRIES = 5;
const codeKey = (uid) => 'nexo_code_' + uid;
const emailjsReady = Boolean(EMAILJS?.serviceId && EMAILJS?.templateId && EMAILJS?.publicKey);

function readCode(uid) {
  try { return JSON.parse(localStorage.getItem(codeKey(uid))) || {}; } catch (e) { return {}; }
}
function writeCode(uid, data) {
  try { localStorage.setItem(codeKey(uid), JSON.stringify(data)); } catch (e) {}
}
function clearCode(uid) {
  try { localStorage.removeItem(codeKey(uid)); } catch (e) {}
}

async function sendCodeEmail(email, nombre, code) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      template_params: { to_email: email, to_name: nombre || email, code, minutes: CODE_TTL_MS / 60_000 }
    })
  }).catch(() => null);
  if (!res || !res.ok) {
    const detail = res ? await res.text().catch(() => '') : 'sin conexión';
    console.warn('[Nexo] EmailJS:', detail);
    throw new Error('No fue posible enviar el correo con el código. Inténtalo de nuevo.');
  }
}

/** Genera un código nuevo y lo envía. Devuelve { cooldown, notice }. */
async function issueCode(user, nombre) {
  const prev = readCode(user.uid);
  const wait = Math.ceil(((prev.sentAt || 0) + RESEND_MS - Date.now()) / 1000);
  if (wait > 0) {
    const err = new Error(`Espera ${wait} s antes de pedir otro código.`);
    err.retryIn = wait;
    throw err;
  }
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const data = { code, nombre: nombre || prev.nombre || null, expiresAt: Date.now() + CODE_TTL_MS, sentAt: Date.now(), tries: 0 };
  writeCode(user.uid, data);

  if (!emailjsReady) {
    // Modo prueba: sin EmailJS configurado el código se muestra en pantalla
    console.info(`[Nexo] Código de verificación para ${user.email}: ${code}`);
    return { cooldown: RESEND_MS / 1000, notice: `Modo prueba (EmailJS sin configurar): tu código es ${code}` };
  }
  try {
    await sendCodeEmail(user.email, data.nombre, code);
  } catch (e) {
    writeCode(user.uid, { ...data, sentAt: 0 }); // permite reintentar de inmediato
    throw e;
  }
  return { cooldown: RESEND_MS / 1000, notice: '' };
}

// Cuenta verificada = tiene perfil. Los perfiles anteriores a esta función no tienen
// el campo "verificado" y se consideran verificados.
async function isVerified(user) {
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() && snap.data().verificado !== false;
}

const pendingOf = (user) => ({ pendingVerification: true, email: user.email });

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
    // Cuenta creada pero sin verificar: la interfaz muestra la pantalla del código
    try {
      if (!(await isVerified(user))) return pendingOf(user);
      currentProfile = await loadFirebaseProfile(user);
      return currentProfile;
    } catch (e) {
      console.warn('[Nexo] No se pudo recuperar el perfil:', e.message);
      return null;
    }
  },

  async login(email, password, requestedRole = 'est') {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!INSTITUTIONAL.test(cleanEmail)) {
      throw new Error('Solo se permiten cuentas con correo institucional (@javeriana.edu.co).');
    }
    if (!password || password.length < 4) {
      throw new Error('Ingresa una contraseña válida.');
    }

    // 1. Firebase Authentication (también da el token para el backend Java).
    //    Las cuentas nuevas se crean en register(); aquí solo se inicia sesión.
    if (this.isFirebaseActive) {
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (signInErr) {
        throw new Error(translateAuthError(signInErr));
      }
      if (!(await isVerified(credential.user))) return pendingOf(credential.user);
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

  /**
   * Registro de estudiantes: crea la cuenta en Firebase Authentication y envía el código
   * de verificación al correo institucional. Devuelve { pendingVerification, email, cooldown }.
   * Los roles de docente / dirección se asignan después con AsignarRol (backend).
   */
  async register(nombre, email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (nombre || '').trim().replace(/\s+/g, ' ');
    if (cleanName.length < 3) throw new Error('Escribe tu nombre completo.');
    if (!INSTITUTIONAL.test(cleanEmail)) {
      throw new Error('Solo puedes registrarte con tu correo institucional (@javeriana.edu.co).');
    }
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (!this.isFirebaseActive) throw new Error('El registro requiere conexión con Firebase.');

    let user;
    try {
      user = (await createUserWithEmailAndPassword(auth, cleanEmail, password)).user;
    } catch (err) {
      if (!String(err.code).includes('email-already-in-use')) throw new Error(translateAuthError(err));
      // Si la cuenta ya existía sin verificar y la contraseña coincide, se retoma la verificación
      try {
        user = (await signInWithEmailAndPassword(auth, cleanEmail, password)).user;
      } catch (e) {
        throw new Error(translateAuthError(err));
      }
      if (await isVerified(user)) {
        await signOut(auth).catch(() => {});
        throw new Error(translateAuthError(err));
      }
    }

    const pending = { ...pendingOf(user), cooldown: 0, sendError: null, info: '' };
    try {
      const r = await issueCode(user, cleanName);
      pending.cooldown = r.cooldown;
      pending.info = r.notice;
    } catch (e) {
      // La cuenta ya existe: el usuario puede reintentar el envío desde la pantalla del código
      pending.sendError = e.message;
      pending.cooldown = e.retryIn || 0;
    }
    return pending;
  },

  /** (Re)envía el código de verificación. Devuelve { cooldown } en segundos. */
  async sendVerificationCode() {
    if (!auth?.currentUser) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    return issueCode(auth.currentUser);
  },

  /** Confirma el código; si es correcto, deja la sesión iniciada y devuelve el perfil. */
  async confirmVerificationCode(code) {
    const clean = String(code || '').replace(/\D/g, '');
    if (clean.length !== 6) throw new Error('Escribe los 6 dígitos del código.');
    const user = auth?.currentUser;
    if (!user) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

    const saved = readCode(user.uid);
    if (!saved.code) throw new Error('No hay un código activo. Pide uno nuevo.');
    if (Date.now() > saved.expiresAt) throw new Error('El código venció. Pide uno nuevo.');
    if (saved.tries >= MAX_TRIES) throw new Error('Demasiados intentos fallidos. Pide un código nuevo.');
    if (clean !== saved.code) {
      writeCode(user.uid, { ...saved, tries: saved.tries + 1 });
      const left = MAX_TRIES - saved.tries - 1;
      throw new Error(left > 0 ? `Código incorrecto. Te quedan ${left} intento${left === 1 ? '' : 's'}.` : 'Código incorrecto. Pide un código nuevo.');
    }

    // Código correcto: se crea el perfil de estudiante (eso marca la cuenta como verificada)
    const email = user.email.toLowerCase();
    const nombre = saved.nombre || email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const data = { email, nombre, rol: 'ESTUDIANTE', verificado: true, createdAt: serverTimestamp() };
    await setDoc(doc(db, 'users', user.uid), data);
    clearCode(user.uid);
    currentProfile = formatProfile(user.uid, data);
    return currentProfile;
  },

  /** true si el botón "Continuar con Microsoft" debe mostrarse. */
  get microsoftEnabled() {
    return Boolean(this.isFirebaseActive && MICROSOFT?.enabled);
  },

  /**
   * Inicio de sesión con la cuenta institucional de Microsoft (ventana emergente).
   * Microsoft ya comprueba que el correo es de la persona, así que no se pide código:
   * si es la primera vez, se crea el perfil de estudiante directamente.
   */
  async loginMicrosoft() {
    if (!this.microsoftEnabled) throw new Error('El inicio con Microsoft no está disponible.');
    const provider = new OAuthProvider('microsoft.com');
    // "tenant" limita la ventana a las cuentas de la universidad
    provider.setCustomParameters({ prompt: 'select_account', tenant: MICROSOFT.tenant || 'organizations' });

    let cred;
    try {
      cred = await signInWithPopup(auth, provider);
    } catch (err) {
      throw new Error(translateMicrosoftError(err));
    }

    const info = getAdditionalUserInfo(cred);
    const user = cred.user;
    const email = (user.email || info?.profile?.mail || info?.profile?.userPrincipalName || '').toLowerCase();
    if (!INSTITUTIONAL.test(email)) {
      // Cuenta ajena a la universidad: se borra si se acaba de crear y se cierra la sesión
      if (info?.isNewUser) await user.delete().catch(() => {});
      await signOut(auth).catch(() => {});
      throw new Error('Usa tu cuenta institucional @javeriana.edu.co.');
    }

    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      currentProfile = formatProfile(user.uid, snap.data());
      return currentProfile;
    }
    const nombre = (user.displayName || info?.profile?.displayName || '').trim()
      || email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const data = { email, nombre, rol: 'ESTUDIANTE', verificado: true, metodo: 'microsoft', createdAt: serverTimestamp() };
    await setDoc(ref, data);
    currentProfile = formatProfile(user.uid, data);
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
  // payload: { subjectId, respuestas: { [id de PREGUNTAS]: 0-4 | true/false | índice },
  //            mantener, detalle }
  // -------------------------------------------------------------
  async createReport(payload) {
    const me = currentProfile;
    if (!me) throw new Error('Inicia sesión para enviar un reporte.');
    const detalle = (payload.detalle || '').trim();

    if (detalle.length < 20) {
      throw new Error('La descripción debe tener al menos 20 caracteres.');
    }

    // Solo se guardan las preguntas conocidas, con valores dentro de su escala
    const valid = (p, v) => {
      if (p.tipo === 'sino') return typeof v === 'boolean' ? v : null;
      const max = p.tipo === 'likert' ? 4 : p.opciones.length - 1;
      return Number.isInteger(v) && v >= 0 && v <= max ? v : null;
    };
    const respuestas = {};
    for (const p of PREGUNTAS) respuestas[p.id] = valid(p, payload.respuestas?.[p.id]);

    // Valoración por categoría: promedio de sus preguntas (neutro si todo fue "No aplica")
    const moods = Object.fromEntries(CATEGORIAS.map(c => [c.key, clampMood(promedioCategoria(respuestas, c) ?? 2)]));
    const mantener = (payload.mantener || '').trim();
    const comentarios = {};

    await javaReady;

    // 1. Backend Java
    if (isJavaBackendActive) {
      const created = await javaFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({ subjectId: payload.subjectId, moods, comentarios, respuestas, formVersion: FORM_VERSION, mantener, detalle })
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
      formVersion: FORM_VERSION,
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
