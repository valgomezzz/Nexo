/**
 * Actualiza conversion.json (raíz del sitio) con la conversión acumulada que
 * muestra la landing, contando directamente en Cloud Firestore.
 *
 *   registros   → perfiles de estudiante en users (se crean al verificar el correo)
 *   activados   → estudiantes con al menos un reporte en reports
 *   reportes    → reportes enviados por esos estudiantes
 *   respondidos → de esos reportes, los que tienen respuesta del docente
 *   visitas     → no está en Firestore: se pasa a mano desde Google Analytics
 *
 * Uso (desde la carpeta scripts):
 *   npm install
 *   node conversion.mjs                         # recalcula y conserva las visitas
 *   node conversion.mjs --visitas 230 --visitas-desde 2026-11-23
 *   node conversion.mjs --corte 2026-11-22      # fecha de corte (por defecto, hoy)
 *   node conversion.mjs --dry-run               # muestra los números sin escribir
 *
 * Credenciales: backend/serviceAccountKey.json (la misma del backend Java) o la
 * variable GOOGLE_APPLICATION_CREDENTIALS. Nunca se sube al repositorio.
 *
 * Cuentas que no son uso real (equipo, pruebas): una por línea, correo o uid, en
 * scripts/cuentas-excluidas.txt. El archivo está en .gitignore.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const SALIDA = path.join(ROOT, 'conversion.json');
const EXCLUIDAS = path.join(DIR, 'cuentas-excluidas.txt');
const ROLES_ESTUDIANTE = new Set(['ESTUDIANTE', 'est']);

/** Cuenta el embudo a partir de los documentos de users y reports. */
export function contar(users, reports, excluidas = new Set()) {
  const fuera = u => excluidas.has(String(u.id).toLowerCase()) || excluidas.has(String(u.email || '').toLowerCase());
  const estudiantes = new Set(
    users.filter(u => ROLES_ESTUDIANTE.has(u.rol) && !fuera(u)).map(u => u.id)
  );
  const suyos = reports.filter(r => estudiantes.has(r.studentUid));
  const activados = new Set(suyos.map(r => r.studentUid));
  const respondidos = suyos.filter(r => String(r.respuesta?.texto || '').trim().length > 0);
  return {
    registros: estudiantes.size,
    activados: activados.size,
    reportes: suyos.length,
    respondidos: respondidos.length
  };
}

function leerArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--visitas') out.visitas = Number(argv[++i]);
    else if (a === '--visitas-desde') out.visitasDesde = argv[++i];
    else if (a === '--corte') out.corte = argv[++i];
    else throw new Error(`Opción desconocida: ${a}`);
  }
  if ('visitas' in out && !(Number.isInteger(out.visitas) && out.visitas >= 0)) throw new Error('--visitas debe ser un entero mayor o igual a 0');
  for (const k of ['visitasDesde', 'corte']) if (out[k] && !/^\d{4}-\d{2}-\d{2}$/.test(out[k])) throw new Error(`--${k === 'corte' ? 'corte' : 'visitas-desde'} debe tener el formato AAAA-MM-DD`);
  return out;
}

const hoyBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

async function main() {
  const args = leerArgs(process.argv.slice(2));
  const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const clave = path.join(ROOT, 'backend', 'serviceAccountKey.json');
  if (existsSync(clave)) initializeApp({ credential: cert(JSON.parse(await readFile(clave, 'utf8'))) });
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) initializeApp({ credential: applicationDefault() });
  else throw new Error('Falta backend/serviceAccountKey.json o la variable GOOGLE_APPLICATION_CREDENTIALS.');

  const excluidas = existsSync(EXCLUIDAS)
    ? new Set((await readFile(EXCLUIDAS, 'utf8')).split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#')))
    : new Set();

  const db = getFirestore();
  const [us, rs] = await Promise.all([db.collection('users').get(), db.collection('reports').get()]);
  const users = us.docs.map(d => ({ id: d.id, ...d.data() }));
  const reports = rs.docs.map(d => d.data());
  const n = contar(users, reports, excluidas);

  const previo = existsSync(SALIDA) ? JSON.parse(await readFile(SALIDA, 'utf8')) : {};
  const datos = {
    desde: previo.desde || '2026-10-11',
    corte: args.corte || hoyBogota(),
    visitas: 'visitas' in args ? args.visitas : (previo.visitas ?? null),
    visitasDesde: args.visitasDesde || previo.visitasDesde || null,
    ...n,
    nota: previo.nota || ''
  };

  console.log(`Excluidas: ${excluidas.size} cuentas`);
  console.table(datos);
  if (args.dryRun) return console.log('--dry-run: no se escribió conversion.json');
  await writeFile(SALIDA, JSON.stringify(datos, null, 2) + '\n');
  console.log(`Listo: ${path.relative(process.cwd(), SALIDA)}. Publica con: firebase deploy --only hosting`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('Error:', err.message); process.exit(1); });
}
