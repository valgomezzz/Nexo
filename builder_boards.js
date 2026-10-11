const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const landingContent = fs.readFileSync('Nexo · Landing page.html', 'utf8');
const rootManifest = JSON.parse(landingContent.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/)[1]);

// Extract Board 3 (Estudiante - Mis asignaturas) which contains the complete font bundle & helmet
const b3Raw = zlib.gunzipSync(Buffer.from(rootManifest['5b6f151c-2097-488a-a07e-3581cf63cf23'].data, 'base64')).toString('utf8');
const b3TplStr = b3Raw.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/)[1];
const b3Template = JSON.parse(b3TplStr);
const helmetMatch = b3Template.match(/<helmet>([\s\S]*?)<\/helmet>/i);
const b3Helmet = helmetMatch ? helmetMatch[1] : '';

// Extra utility styles to complement the existing design system
const extraStyles = `
<style>
.date-badge{display:flex;flex-direction:column;align-items:center;justify-content:center;width:58px;height:58px;border-radius:18px;background:linear-gradient(145deg,#fff,#F6EAEA);border:1.5px solid #E7DFDB;box-shadow:inset 0 1px 0 #fff,0 6px 14px -6px rgba(131,47,47,.25);color:#832F2F;flex:none}
.date-badge strong{font-family:'Fraunces',Georgia,serif;font-size:22px;line-height:1;font-weight:700}
.date-badge span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6B5E60}
.tag-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;background:#F3EEEB;color:#6B5E60}
.sem-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.sem-badge.alto{background:#FCEBEB;color:#B3403A}
.sem-badge.alto i{width:8px;height:8px;border-radius:50%;background:#B3403A;box-shadow:0 0 0 3px rgba(179,64,58,.25)}
.sem-badge.medio{background:#FDF2E2;color:#C98418}
.sem-badge.medio i{width:8px;height:8px;border-radius:50%;background:#C98418;box-shadow:0 0 0 3px rgba(201,132,24,.25)}
.sem-badge.bajo{background:#E1F1E5;color:#2A6A3D}
.sem-badge.bajo i{width:8px;height:8px;border-radius:50%;background:#4B9862;box-shadow:0 0 0 3px rgba(75,152,98,.25)}
.stat-track{height:10px;border-radius:999px;background:#E7DFDB;overflow:hidden;position:relative}
.stat-fill{height:100%;border-radius:999px;transition:width .4s}
.bignum-val{font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:clamp(64px,6vw,92px);line-height:.9;letter-spacing:-.04em;color:#832F2F}
.nav-tab{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;font-size:14px;font-weight:600;border:1.5px solid #D9CEC9;background:#fff;color:#6B5E60;cursor:pointer;transition:all .2s;box-shadow:0 2px 4px rgba(64,32,32,.06)}
.nav-tab:hover{border-color:#832F2F;color:#2B1E1F}
.nav-tab.active{background:linear-gradient(180deg,#9A3A3A,#7A2A2A);color:#fff;border-color:transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 10px 20px -8px rgba(131,47,47,.65)}
.nav-tab .badge{padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(0,0,0,.08);color:inherit}
.nav-tab.active .badge{background:rgba(255,255,255,.25);color:#fff}
.custom-select{padding:10px 38px 10px 18px;border-radius:999px;border:1.5px solid #D9CEC9;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23832F2F' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center;font:inherit;font-weight:600;font-size:14px;color:#2B1E1F;cursor:pointer;box-shadow:0 2px 4px rgba(64,32,32,.06);outline:none}
.crumbs-nav{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#6B5E60;margin-bottom:12px}
.crumbs-nav a{color:#832F2F;text-decoration:none;transition:color .2s}
.crumbs-nav a:hover{text-decoration:underline}
.timeline-dot{width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #E7DFDB;flex:none}
</style>
`;

function createPage(title, bodyInner) {
  const innerTemplate = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
<x-dc>
<helmet>
${b3Helmet}
${extraStyles}
</helmet>
${bodyInner}
</x-dc>
</body></html>`;

  let outer = b3Raw;
  outer = outer.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  outer = outer.replace(/<div id="__bundler_placeholder">[\s\S]*?<\/div>/i, `<div id="__bundler_placeholder">Loading ${title}...</div>`);
  outer = outer.replace(
    /<script type="__bundler\/template">[\s\S]*?<\/script>/,
    `<script type="__bundler/template">\n${JSON.stringify(innerTemplate)}\n  </script>`
  );
  return outer;
}

function createDocentDock(activePage = 'reports', pendingCount = 3) {
  return `
<aside class="dock" style="flex:0 0 268px">
  <div style="display:flex;align-items:center;gap:12px;padding:0 8px">
    <svg width="44" height="44" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#832F2F"/><circle cx="12.5" cy="10.5" r="3.2" fill="#fff"/><circle cx="23.5" cy="10.5" r="3.2" fill="#A2CDAB"/><path d="M10 27v-8.5a3 3 0 0 1 5.6-1.5L20.4 25a3 3 0 0 0 5.6-1.5V18" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="d" style="font-size:26px;font-weight:700;color:#2B1E1F">nexo</span>
  </div>
  <nav style="display:flex;flex-direction:column;gap:6px">
    <a class="nv ${activePage === 'reports' ? 'on' : ''}" href="#" style="position:relative">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
      <span style="flex:1">Reportes recibidos</span>
      ${pendingCount ? `<span style="padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;background:${activePage === 'reports' ? '#fff' : '#D9952B'};color:${activePage === 'reports' ? '#832F2F' : '#fff'}">${pendingCount}</span>` : ''}
    </a>
    <a class="nv ${activePage === 'stats' ? 'on' : ''}" href="#">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M8 17V11M13 17V7M18 17v-4"/></svg>
      <span>Estadísticas</span>
    </a>
    <a class="nv ${activePage === 'courses' ? 'on' : ''}" href="#">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2zM22 4.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7z"/></svg>
      <span>Mis asignaturas</span>
    </a>
  </nav>

  <!-- Mini card resumen en dock -->
  <div style="position:relative;overflow:hidden;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#9A3A3A,#6E2626);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 12px 24px -10px rgba(110,38,38,.6);display:flex;align-items:center;gap:14px">
    <svg width="48" height="48" viewBox="0 0 56 56" style="flex:0 0 48px"><circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="6"/><circle cx="28" cy="28" r="22" fill="none" stroke="#A2CDAB" stroke-width="6" stroke-linecap="round" stroke-dasharray="82.9 138.2" transform="rotate(-90 28 28)"/></svg>
    <div>
      <div class="d" style="font-size:18px;font-weight:600">3 de 5</div>
      <div style="font-size:12px;color:#F1D9D9;line-height:1.25">reportes pendientes por atender</div>
    </div>
  </div>

  <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 12px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.7));box-shadow:inset 0 1px 0 #fff,0 16px 28px -14px rgba(64,32,32,.4)">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <span style="position:relative;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#2B1E1F;background:linear-gradient(145deg,#D5DEE3,#9FB0B8);border:2px solid #fff;box-shadow:0 6px 14px -4px rgba(64,32,32,.35)">MG<i style="position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;border-radius:50%;background:#6DAF7E;border:2px solid #fff"></i></span>
      <div style="min-width:0"><div style="font-weight:700;font-size:14px;color:#2B1E1F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">María García</div><div style="font-size:12px;color:#6B5E60">Docente titular</div></div>
    </div>
    <a class="out" href="#" aria-label="Cerrar sesión" title="Cerrar sesión" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></a>
  </div>
</aside>`;
}

function createDirDock(activePage = 'weekly') {
  return `
<aside class="dock" style="flex:0 0 268px">
  <div style="display:flex;align-items:center;gap:12px;padding:0 8px">
    <svg width="44" height="44" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" fill="#832F2F"/><circle cx="12.5" cy="10.5" r="3.2" fill="#fff"/><circle cx="23.5" cy="10.5" r="3.2" fill="#A2CDAB"/><path d="M10 27v-8.5a3 3 0 0 1 5.6-1.5L20.4 25a3 3 0 0 0 5.6-1.5V18" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="d" style="font-size:26px;font-weight:700;color:#2B1E1F">nexo</span>
  </div>
  <nav style="display:flex;flex-direction:column;gap:6px">
    <a class="nv ${activePage === 'weekly' ? 'on' : ''}" href="#">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      <span>Panorama semanal</span>
    </a>
    <a class="nv ${activePage === 'subjects' ? 'on' : ''}" href="#">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2zM22 4.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7z"/></svg>
      <span>Grupos y materias</span>
    </a>
  </nav>

  <!-- Widget directivo -->
  <div style="position:relative;overflow:hidden;padding:16px;border-radius:20px;color:#fff;background:linear-gradient(135deg,#9A3A3A,#6E2626);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 12px 24px -10px rgba(110,38,38,.6)">
    <div style="font-size:12px;color:#F1D9D9;text-transform:uppercase;letter-spacing:.08em;font-weight:700">Facultad de Ingeniería</div>
    <div class="d" style="font-size:28px;font-weight:700;margin:6px 0 2px">28 reportes</div>
    <div style="font-size:13px;color:#F1D9D9">recibidos en el programa</div>
  </div>

  <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 12px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.7));box-shadow:inset 0 1px 0 #fff,0 16px 28px -14px rgba(64,32,32,.4)">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <span style="position:relative;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#2B1E1F;background:linear-gradient(145deg,#E6B979,#D9952B);border:2px solid #fff;box-shadow:0 6px 14px -4px rgba(64,32,32,.35)">AT<i style="position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;border-radius:50%;background:#6DAF7E;border:2px solid #fff"></i></span>
      <div style="min-width:0"><div style="font-weight:700;font-size:14px;color:#2B1E1F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Ana Torres</div><div style="font-size:12px;color:#6B5E60">Dirección de programa</div></div>
    </div>
    <a class="out" href="#" aria-label="Cerrar sesión" title="Cerrar sesión" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></a>
  </div>
</aside>`;
}

const sceneHtml = `
<div class="scene">
  <div class="blob" style="width:440px;height:440px;background:#B295B0;opacity:.32;right:-120px;top:-100px"></div>
  <div class="blob" style="width:380px;height:380px;background:#A2CDAB;opacity:.25;left:-100px;bottom:-80px;animation-delay:-7s"></div>
  <div class="orbit" style="width:720px;height:720px;left:calc(50% - 360px);top:calc(50% - 360px);border:1px dashed rgba(131,47,47,.22);animation-duration:60s"><i style="background:#832F2F"></i></div>
  <div class="pulse" style="width:500px;height:500px;left:calc(50% - 250px);top:calc(50% - 250px)"></div>
</div>`;

// ==========================================
// 1. BOARD: Docente · Reportes recibidos
// ==========================================
const b1_DocPanel = `
<div class="root">
  ${sceneHtml}
  <div style="display:flex;min-height:940px">
    ${createDocentDock('reports', 3)}
    <main class="z" style="flex:1;min-width:0;padding:44px 48px;display:flex;flex-direction:column;gap:28px">
      <header>
        <p style="margin:0;font-weight:700;color:#832F2F;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Semana 6, del 8 al 12 de septiembre · Semestre 2026-2</p>
        <h1 class="d" style="font-size:clamp(32px,3.2vw,46px);line-height:1.08;font-weight:600;margin-top:10px;max-width:26ch">Hola, María. Tienes 3 reportes pendientes.</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#6B5E60">Cambia el estado de cada reporte para que el estudiante sepa que lo leíste.</p>
      </header>

      <!-- Banner de acción -->
      <section style="position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:30px 36px;border-radius:30px;color:#fff;background:linear-gradient(135deg,#9A3A3A 0%,#6E2626 60%,#4F1C1C 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 4px rgba(64,32,32,.2),0 30px 60px -24px rgba(110,38,38,.75)">
        <div class="orbit" style="width:260px;height:260px;right:-40px;top:-90px;border:1px dashed rgba(255,255,255,.3);animation-duration:28s"><i style="background:#A2CDAB"></i></div>
        <div style="position:relative;max-width:48ch">
          <h2 class="d" style="font-size:26px;font-weight:600">3 reportes requieren tu respuesta</h2>
          <p style="margin:6px 0 0;color:#F1D9D9;font-size:15px;line-height:1.45">Los estudiantes de Matemáticas III y Física II esperan seguimiento sobre las barreras reportadas.</p>
        </div>
        <div style="display:flex;gap:10px;position:relative">
          <button class="btn" style="border:0;background:#fff;color:#832F2F;min-height:48px;padding:0 24px;box-shadow:0 12px 24px -10px rgba(0,0,0,.4)">Responder pendientes</button>
        </div>
      </section>

      <!-- Barra de filtros -->
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="nav-tab">Todos <span class="badge">5</span></button>
          <button class="nav-tab active">Pendientes <span class="badge">3</span></button>
          <button class="nav-tab">En revisión <span class="badge">2</span></button>
          <button class="nav-tab">Atendidos <span class="badge">2</span></button>
        </div>
        <select class="custom-select">
          <option>Todas las asignaturas</option>
          <option>Matemáticas III</option>
          <option>Física II</option>
          <option>Programación I</option>
        </select>
      </div>

      <!-- Lista de reportes en Glass Panel -->
      <section class="glass" style="border-radius:30px;padding:28px 28px 32px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px">
          <h2 class="d" style="font-size:24px;font-weight:600">Reportes de tus asignaturas</h2>
          <span style="font-size:14px;color:#6B5E60">5 reportes en total</span>
        </div>
        <ul style="margin:0;padding:0;display:flex;flex-direction:column;gap:14px;list-style:none">
          
          <!-- Reporte 1 -->
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06),0 16px 28px -16px rgba(64,32,32,.28)">
            <div class="date-badge"><strong>12</strong><span>sep</span></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:17px;color:#2B1E1F">Proyector no funciona en el aula 201 y no se ven las diapositivas</div>
              <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:#832F2F">Matemáticas III</span>
                <span class="tag-badge">Metodología</span>
                <span style="font-size:13px;color:#6B5E60">Grupo 1</span>
              </div>
            </div>
            <span class="pill" style="background:#FBEBD3;color:#85500C;cursor:pointer">Pendiente <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>
          </li>

          <!-- Reporte 2 -->
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06),0 16px 28px -16px rgba(64,32,32,.28)">
            <div class="date-badge"><strong>10</strong><span>sep</span></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:17px;color:#2B1E1F">Faltan tizas y borradores en el laboratorio para los ejercicios prácticos</div>
              <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:#832F2F">Física II</span>
                <span class="tag-badge">Contenido</span>
                <span style="font-size:13px;color:#6B5E60">Grupo 2</span>
              </div>
            </div>
            <span class="pill" style="background:#ECE3EB;color:#62405F;cursor:pointer">En revisión <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>
          </li>

          <!-- Reporte 3 -->
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06),0 16px 28px -16px rgba(64,32,32,.28)">
            <div class="date-badge"><strong>09</strong><span>sep</span></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:17px;color:#2B1E1F">Licencia del IDE vencida en el laboratorio 4 y no podemos correr el código</div>
              <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:#832F2F">Programación I</span>
                <span class="tag-badge">Contenido</span>
                <span style="font-size:13px;color:#6B5E60">Grupo 1</span>
              </div>
            </div>
            <span class="pill" style="background:#ECE3EB;color:#62405F;cursor:pointer">En revisión <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>
          </li>

          <!-- Reporte 4 -->
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06),0 16px 28px -16px rgba(64,32,32,.28)">
            <div class="date-badge"><strong>08</strong><span>sep</span></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:17px;color:#2B1E1F">Gotera cerca de la ventana en días de lluvia interrumpe las clases</div>
              <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:#832F2F">Matemáticas III</span>
                <span class="tag-badge">Ritmo</span>
                <span style="font-size:13px;color:#6B5E60">Grupo 1</span>
              </div>
            </div>
            <span class="pill" style="background:#E1F1E5;color:#2A6A3D">Atendido</span>
          </li>

          <!-- Reporte 5 -->
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06),0 16px 28px -16px rgba(64,32,32,.28)">
            <div class="date-badge"><strong>05</strong><span>sep</span></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:17px;color:#2B1E1F">Mesa de trabajo inestable en la fila 3 dificulta armar los circuitos</div>
              <div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:#832F2F">Física II</span>
                <span class="tag-badge">Metodología</span>
                <span style="font-size:13px;color:#6B5E60">Grupo 2</span>
              </div>
            </div>
            <span class="pill" style="background:#E1F1E5;color:#2A6A3D">Atendido</span>
          </li>
        </ul>
      </section>
    </main>
  </div>
</div>`;

// ==========================================
// 2. BOARD: Docente · Estadísticas y Métricas
// ==========================================
const b2_DocStats = `
<div class="root">
  ${sceneHtml}
  <div style="display:flex;min-height:1040px">
    ${createDocentDock('stats', 3)}
    <main class="z" style="flex:1;min-width:0;padding:44px 48px;display:flex;flex-direction:column;gap:28px">
      <header>
        <p style="margin:0;font-weight:700;color:#832F2F;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Semana 6, del 8 al 12 de septiembre · Métricas consolidadas</p>
        <h1 class="d" style="font-size:clamp(32px,3.2vw,46px);line-height:1.08;font-weight:600;margin-top:10px;max-width:28ch">Matemáticas III concentra tus reportes pendientes.</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#6B5E60">Tiene 2 de 3 reportes sin responder. Tus estudiantes valoran mejor el contenido y piden revisar el ritmo.</p>
      </header>

      <!-- Fila superior de métricas -->
      <div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px">
        
        <!-- Big Card -->
        <section class="glass" style="border-radius:30px;padding:32px;display:flex;flex-direction:column;justify-content:space-between;gap:24px">
          <div>
            <div class="bignum-val">12</div>
            <div style="font-size:16px;color:#6B5E60;margin-top:4px">reportes recibidos en tus asignaturas este semestre</div>
          </div>

          <!-- Barra segmentada con esquinas suaves -->
          <div style="display:flex;height:18px;border-radius:999px;overflow:hidden;gap:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,.1)">
            <div style="flex:5;background:#D9952B;border-radius:999px 0 0 999px" title="5 Pendientes"></div>
            <div style="flex:3;background:#B295B0" title="3 En revisión"></div>
            <div style="flex:4;background:#6DAF7E;border-radius:0 999px 999px 0" title="4 Atendidos"></div>
          </div>

          <!-- Leyenda -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-top:12px;border-top:1px solid #E7DFDB">
            <div>
              <div class="d" style="font-size:26px;font-weight:700;color:#2B1E1F">5</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#85500C;font-weight:600"><span style="width:8px;height:8px;border-radius:50%;background:#D9952B"></span>Pendientes</div>
            </div>
            <div>
              <div class="d" style="font-size:26px;font-weight:700;color:#2B1E1F">3</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#62405F;font-weight:600"><span style="width:8px;height:8px;border-radius:50%;background:#B295B0"></span>En revisión</div>
            </div>
            <div>
              <div class="d" style="font-size:26px;font-weight:700;color:#2B1E1F">4</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#2A6A3D;font-weight:600"><span style="width:8px;height:8px;border-radius:50%;background:#6DAF7E"></span>Atendidos</div>
            </div>
          </div>
        </section>

        <!-- Distribución de Categorías -->
        <section class="glass" style="border-radius:30px;padding:32px;display:flex;flex-direction:column;gap:20px">
          <h2 class="d" style="font-size:22px;font-weight:600">¿Sobre qué te reportan?</h2>
          <div style="display:flex;flex-direction:column;gap:18px">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Metodología</span><span>42 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:42%;background:linear-gradient(90deg,#9A3A3A,#832F2F)"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Contenido</span><span>33 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:33%;background:linear-gradient(90deg,#B295B0,#867ED3)"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Ritmo</span><span>25 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:25%;background:linear-gradient(90deg,#A2CDAB,#6DAF7E)"></div></div>
            </div>
          </div>
        </section>
      </div>

      <!-- Fila inferior: Valoraciones y Semanas -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        
        <!-- Valoraciones -->
        <section class="glass" style="border-radius:30px;padding:30px;display:flex;flex-direction:column;gap:18px">
          <h2 class="d" style="font-size:22px;font-weight:600">Cómo te valoran tus estudiantes</h2>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;align-items:center;gap:14px">
              <span style="font-size:24px">😊</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600"><span>Contenido</span><strong>3.9 <small style="color:#6B5E60;font-weight:500">de 5</small></strong></div>
                <div class="stat-track" style="margin-top:6px"><div class="stat-fill" style="width:78%;background:#6DAF7E"></div></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span style="font-size:24px">😐</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600"><span>Metodología</span><strong>3.4 <small style="color:#6B5E60;font-weight:500">de 5</small></strong></div>
                <div class="stat-track" style="margin-top:6px"><div class="stat-fill" style="width:68%;background:#D9952B"></div></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span style="font-size:24px">😟</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600"><span>Ritmo</span><strong>2.6 <small style="color:#6B5E60;font-weight:500">de 5</small></strong></div>
                <div class="stat-track" style="margin-top:6px"><div class="stat-fill" style="width:52%;background:#B3403A"></div></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Reportes por semana -->
        <section class="glass" style="border-radius:30px;padding:30px;display:flex;flex-direction:column;gap:18px">
          <h2 class="d" style="font-size:22px;font-weight:600">Reportes por semana</h2>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;height:140px;padding-top:10px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:13px">1</strong><div style="width:100%;max-width:32px;height:24px;border-radius:8px 8px 4px 4px;background:#E7DFDB"></div><span style="font-size:12px;color:#6B5E60">S1</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:13px">3</strong><div style="width:100%;max-width:32px;height:64px;border-radius:8px 8px 4px 4px;background:#E7DFDB"></div><span style="font-size:12px;color:#6B5E60">S2</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:13px">2</strong><div style="width:100%;max-width:32px;height:44px;border-radius:8px 8px 4px 4px;background:#E7DFDB"></div><span style="font-size:12px;color:#6B5E60">S3</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:13px">4</strong><div style="width:100%;max-width:32px;height:84px;border-radius:8px 8px 4px 4px;background:#E7DFDB"></div><span style="font-size:12px;color:#6B5E60">S4</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:13px">3</strong><div style="width:100%;max-width:32px;height:64px;border-radius:8px 8px 4px 4px;background:#E7DFDB"></div><span style="font-size:12px;color:#6B5E60">S5</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1"><strong style="font-size:14px;color:#832F2F">5</strong><div style="width:100%;max-width:32px;height:104px;border-radius:8px 8px 4px 4px;background:linear-gradient(180deg,#9A3A3A,#832F2F);box-shadow:0 6px 14px -4px rgba(131,47,47,.5)"></div><span style="font-size:12px;font-weight:700;color:#832F2F">S6</span></div>
          </div>
        </section>
      </div>

      <!-- Tabla de Asignaturas de mayor a menor urgencia -->
      <section class="glass" style="border-radius:30px;padding:28px 32px">
        <h2 class="d" style="font-size:22px;font-weight:600;margin-bottom:18px">Tus asignaturas, de mayor a menor urgencia</h2>
        <div style="display:flex;flex-direction:column;gap:12px">
          
          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:16px 20px;border-radius:18px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <span class="mk" style="width:46px;height:46px;font-size:15px">M3</span>
            <div style="flex:1 1 200px">
              <div style="font-weight:700;font-size:16px">Matemáticas III</div>
              <div style="font-size:13px;color:#6B5E60">Grupo 1 · 4 reportes</div>
            </div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px">
              <div style="flex:2;background:#D9952B"></div>
              <div style="flex:1;background:#B295B0"></div>
              <div style="flex:1;background:#6DAF7E"></div>
            </div>
            <div style="text-align:right;min-width:60px"><strong>4</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#B3403A">2</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge alto"><i></i>Alto</span>
          </div>

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:16px 20px;border-radius:18px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <span class="mk" style="width:46px;height:46px;font-size:15px;background:linear-gradient(145deg,#867ED3,#62405F)">F2</span>
            <div style="flex:1 1 200px">
              <div style="font-weight:700;font-size:16px">Física II</div>
              <div style="font-size:13px;color:#6B5E60">Grupo 2 · 3 reportes</div>
            </div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px">
              <div style="flex:1;background:#D9952B"></div>
              <div style="flex:1;background:#B295B0"></div>
              <div style="flex:1;background:#6DAF7E"></div>
            </div>
            <div style="text-align:right;min-width:60px"><strong>3</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#C98418">1</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge medio"><i></i>Medio</span>
          </div>

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:16px 20px;border-radius:18px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <span class="mk" style="width:46px;height:46px;font-size:15px;background:linear-gradient(145deg,#4B9862,#2A6A3D)">P1</span>
            <div style="flex:1 1 200px">
              <div style="font-weight:700;font-size:16px">Programación I</div>
              <div style="font-size:13px;color:#6B5E60">Grupo 1 · 2 reportes</div>
            </div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px">
              <div style="flex:0;background:#D9952B"></div>
              <div style="flex:1;background:#B295B0"></div>
              <div style="flex:1;background:#6DAF7E"></div>
            </div>
            <div style="text-align:right;min-width:60px"><strong>2</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#2A6A3D">0</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge bajo"><i></i>Bajo</span>
          </div>

        </div>
      </section>
    </main>
  </div>
</div>`;

// ==========================================
// 3. BOARD: Docente · Mis asignaturas
// ==========================================
const b3_DocAsig = `
<div class="root">
  ${sceneHtml}
  <div style="display:flex;min-height:900px">
    ${createDocentDock('courses', 3)}
    <main class="z" style="flex:1;min-width:0;padding:44px 48px;display:flex;flex-direction:column;gap:28px">
      <header>
        <p style="margin:0;font-weight:700;color:#832F2F;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Semestre 2026-2 · Asignaciones académicas</p>
        <h1 class="d" style="font-size:clamp(32px,3.2vw,46px);line-height:1.08;font-weight:600;margin-top:10px">Tus asignaturas a cargo</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#6B5E60">Abre una asignatura para ver solo sus reportes de barreras académicas.</p>
      </header>

      <section class="glass" style="border-radius:30px;padding:32px">
        <ul style="margin:0;padding:0;display:flex;flex-direction:column;gap:14px;list-style:none">
          
          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk">M3</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:18px">Matemáticas III</div>
              <div style="font-size:14px;color:#6B5E60;margin-top:2px">Grupo 1 · 4 reportes este semestre</div>
            </div>
            <span class="pill" style="background:#FBEBD3;color:#85500C;font-weight:700">2 pendientes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </li>

          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#867ED3,#62405F)">F2</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:18px">Física II</div>
              <div style="font-size:14px;color:#6B5E60;margin-top:2px">Grupo 2 · 3 reportes este semestre</div>
            </div>
            <span class="pill" style="background:#FBEBD3;color:#85500C;font-weight:700">1 pendiente</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </li>

          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#4B9862,#2A6A3D)">P1</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:18px">Programación I</div>
              <div style="font-size:14px;color:#6B5E60;margin-top:2px">Grupo 1 · 2 reportes este semestre</div>
            </div>
            <span class="pill" style="background:#E1F1E5;color:#2A6A3D;font-weight:700">Al día</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </li>

          <li class="lift" style="display:flex;align-items:center;gap:18px;padding:18px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#B1BEC4,#7E93B6)">QA</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:18px">Química Analítica</div>
              <div style="font-size:14px;color:#6B5E60;margin-top:2px">Grupo 3 · Sin reportes todavía</div>
            </div>
            <span style="font-size:13px;color:#6B5E60">—</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </li>

        </ul>
      </section>
    </main>
  </div>
</div>`;

// ==========================================
// 4. BOARD: Dirección · Panorama semanal
// ==========================================
const b4_DirPanel = `
<div class="root">
  ${sceneHtml}
  <div style="display:flex;min-height:980px">
    ${createDirDock('weekly')}
    <main class="z" style="flex:1;min-width:0;padding:44px 48px;display:flex;flex-direction:column;gap:28px">
      <header>
        <p style="margin:0;font-weight:700;color:#832F2F;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Semana 6, del 8 al 12 de septiembre · Dirección de Programa</p>
        <h1 class="d" style="font-size:clamp(32px,3.2vw,46px);line-height:1.08;font-weight:600;margin-top:10px;max-width:26ch">Cálculo Diferencial necesita atención esta semana.</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#6B5E60">Tiene 9 de 14 reportes sin responder, la proporción más alta del programa de ingeniería.</p>
      </header>

      <!-- Grid de indicadores superiores -->
      <div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px">
        <section class="glass" style="border-radius:30px;padding:32px;display:flex;flex-direction:column;justify-content:space-between;gap:24px">
          <div>
            <div class="bignum-val">28</div>
            <div style="font-size:16px;color:#6B5E60;margin-top:4px">reportes recibidos en todo el programa esta semana</div>
          </div>
          <div style="display:flex;height:18px;border-radius:999px;overflow:hidden;gap:3px">
            <div style="flex:15;background:#D9952B;border-radius:999px 0 0 999px"></div>
            <div style="flex:6;background:#B295B0"></div>
            <div style="flex:7;background:#6DAF7E;border-radius:0 999px 999px 0"></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-top:12px;border-top:1px solid #E7DFDB">
            <div><div class="d" style="font-size:26px;font-weight:700">15</div><div style="font-size:13px;color:#85500C;font-weight:600">Pendientes</div></div>
            <div><div class="d" style="font-size:26px;font-weight:700">6</div><div style="font-size:13px;color:#62405F;font-weight:600">En revisión</div></div>
            <div><div class="d" style="font-size:26px;font-weight:700">7</div><div style="font-size:13px;color:#2A6A3D;font-weight:600">Atendidos</div></div>
          </div>
        </section>

        <section class="glass" style="border-radius:30px;padding:32px;display:flex;flex-direction:column;gap:20px">
          <h2 class="d" style="font-size:22px;font-weight:600">¿Sobre qué reportan los estudiantes?</h2>
          <div style="display:flex;flex-direction:column;gap:18px">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Metodología de clase</span><span>40 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:40%;background:#832F2F"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Claridad del contenido</span><span>35 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:35%;background:#867ED3"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px"><span>Ritmo de aprendizaje</span><span>25 %</span></div>
              <div class="stat-track"><div class="stat-fill" style="width:25%;background:#6DAF7E"></div></div>
            </div>
          </div>
        </section>
      </div>

      <!-- Ranking general del programa -->
      <section class="glass" style="border-radius:30px;padding:30px 32px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px">
          <h2 class="d" style="font-size:22px;font-weight:600">Asignaturas, de mayor a menor urgencia</h2>
          <span style="font-size:13px;color:#6B5E60">El semáforo compara pendientes con el total de cada materia</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk">CD</span>
            <div style="flex:1 1 200px"><div style="font-weight:700;font-size:17px">Cálculo Diferencial</div><div style="font-size:13px;color:#6B5E60">3 grupos en el semestre</div></div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px"><div style="flex:9;background:#D9952B"></div><div style="flex:2;background:#B295B0"></div><div style="flex:3;background:#6DAF7E"></div></div>
            <div style="text-align:right;min-width:60px"><strong>14</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#B3403A">9</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge alto"><i></i>Alto</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#867ED3,#62405F)">ED</span>
            <div style="flex:1 1 200px"><div style="font-weight:700;font-size:17px">Estructuras de Datos</div><div style="font-size:13px;color:#6B5E60">2 grupos en el semestre</div></div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px"><div style="flex:5;background:#D9952B"></div><div style="flex:3;background:#B295B0"></div><div style="flex:3;background:#6DAF7E"></div></div>
            <div style="text-align:right;min-width:60px"><strong>11</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#B3403A">5</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge alto"><i></i>Alto</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#D9952B,#85500C)">IS</span>
            <div style="flex:1 1 200px"><div style="font-weight:700;font-size:17px">Ingeniería de Software</div><div style="font-size:13px;color:#6B5E60">1 grupo en el semestre</div></div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px"><div style="flex:3;background:#D9952B"></div><div style="flex:4;background:#B295B0"></div><div style="flex:2;background:#6DAF7E"></div></div>
            <div style="text-align:right;min-width:60px"><strong>9</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#C98418">3</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge medio"><i></i>Medio</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="lift" style="display:flex;align-items:center;gap:20px;padding:18px 22px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06);cursor:pointer">
            <span class="mk" style="background:linear-gradient(145deg,#4B9862,#2A6A3D)">BD</span>
            <div style="flex:1 1 200px"><div style="font-weight:700;font-size:17px">Bases de Datos I</div><div style="font-size:13px;color:#6B5E60">1 grupo en el semestre</div></div>
            <div style="flex:2;display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px"><div style="flex:1;background:#D9952B"></div><div style="flex:2;background:#B295B0"></div><div style="flex:5;background:#6DAF7E"></div></div>
            <div style="text-align:right;min-width:60px"><strong>8</strong> <small style="color:#6B5E60">total</small></div>
            <div style="text-align:right;min-width:70px"><strong style="color:#2A6A3D">1</strong> <small style="color:#6B5E60">pend.</small></div>
            <span class="sem-badge bajo"><i></i>Bajo</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5E60" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </div>

        </div>
      </section>
    </main>
  </div>
</div>`;

// ==========================================
// 5. BOARD: Dirección · Detalle Grupo y Feedback Estudiantil
// ==========================================
const b5_DirGrupo = `
<div class="root">
  ${sceneHtml}
  <div style="display:flex;min-height:920px">
    ${createDirDock('subjects')}
    <main class="z" style="flex:1;min-width:0;padding:44px 48px;display:flex;flex-direction:column;gap:28px">
      <header>
        <div class="crumbs-nav">
          <a href="#">Panorama semanal</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          <a href="#">Cálculo Diferencial</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
          <span>Grupo 1</span>
        </div>
        <h1 class="d" style="font-size:clamp(32px,3.2vw,44px);line-height:1.08;font-weight:600;margin-top:4px">Andrea Ruiz — Grupo 1</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#6B5E60">Grupo 1 de Cálculo Diferencial. Estos son los reportes de sus estudiantes, del más reciente al más antiguo.</p>
      </header>

      <!-- Resumen del grupo -->
      <section class="glass" style="border-radius:24px;padding:24px 30px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
        <div>
          <span class="sem-badge alto" style="font-size:14px;padding:6px 14px"><i></i>Atención recomendada</span>
          <div style="margin-top:6px;font-size:15px;color:#6B5E60">4 reportes totales, 2 siguen sin responder por el docente</div>
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn" style="min-height:44px;font-size:14px">Contactar docente</button>
          <button class="btn p" style="min-height:44px;font-size:14px">Ver otros grupos</button>
        </div>
      </section>

      <!-- Timeline de reportes estudiantiles -->
      <section class="glass" style="border-radius:30px;padding:32px">
        <h2 class="d" style="font-size:22px;font-weight:600;margin-bottom:24px">Trazabilidad de reportes del grupo</h2>
        <div style="display:flex;flex-direction:column;gap:18px">
          
          <div class="lift" style="display:flex;gap:20px;padding:22px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <div class="date-badge"><strong>10</strong><span>sep</span></div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:20px">😟</span>
                  <span class="tag-badge">Metodología</span>
                </div>
                <span class="pill" style="background:#FBEBD3;color:#85500C">Pendiente</span>
              </div>
              <p style="margin:0;font-size:16px;line-height:1.55;color:#2B1E1F">"El ritmo de la clase es muy rápido, no alcanzo a tomar apuntes y los temas de límites trigonométricos se acumulan antes del examen parcial."</p>
            </div>
          </div>

          <div class="lift" style="display:flex;gap:20px;padding:22px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <div class="date-badge"><strong>09</strong><span>sep</span></div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:20px">😐</span>
                  <span class="tag-badge">Contenido</span>
                </div>
                <span class="pill" style="background:#ECE3EB;color:#62405F">En revisión</span>
              </div>
              <p style="margin:0;font-size:16px;line-height:1.55;color:#2B1E1F">"Los ejemplos del tema 4 no corresponden con los ejercicios propuestos para el taller evaluativo, hay dudas sobre el despeje."</p>
            </div>
          </div>

          <div class="lift" style="display:flex;gap:20px;padding:22px 24px;border-radius:20px;background:#fff;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(64,32,32,.06)">
            <div class="date-badge"><strong>05</strong><span>sep</span></div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:20px">😊</span>
                  <span class="tag-badge">Ritmo</span>
                </div>
                <span class="pill" style="background:#E1F1E5;color:#2A6A3D">Atendido</span>
              </div>
              <p style="margin:0;font-size:16px;line-height:1.55;color:#2B1E1F">"Se resolvió el problema de acceso al material complementario en la carpeta compartida de Teams."</p>
            </div>
          </div>

        </div>
      </section>
    </main>
  </div>
</div>`;

// Pack boards into gzipped base64 entries
const boards = [
  { id: crypto.randomUUID(), title: 'Docente · Reportes recibidos', html: createPage('Nexo · Docente: Reportes recibidos', b1_DocPanel), width: 1440, height: 960 },
  { id: crypto.randomUUID(), title: 'Docente · Estadísticas y métricas', html: createPage('Nexo · Docente: Estadísticas', b2_DocStats), width: 1440, height: 1060 },
  { id: crypto.randomUUID(), title: 'Docente · Mis asignaturas', html: createPage('Nexo · Docente: Mis asignaturas', b3_DocAsig), width: 1440, height: 920 },
  { id: crypto.randomUUID(), title: 'Dirección · Panorama semanal', html: createPage('Nexo · Dirección: Panorama semanal', b4_DirPanel), width: 1440, height: 1000 },
  { id: crypto.randomUUID(), title: 'Dirección · Detalle de grupo', html: createPage('Nexo · Dirección: Detalle de grupo', b5_DirGrupo), width: 1440, height: 940 }
];

console.log('Generated 5 boards successfully!');

// Now read the original "Nexo · Landing page.html"
const originalLanding = fs.readFileSync('Nexo · Landing page.html', 'utf8');

const manifestMatch = originalLanding.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);

if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  const ORIGINAL_5 = [
    'a025f1a6-652c-4485-950c-0a8086ad0eba',
    '3cd769b0-5f32-49d4-ac05-c9ac7d1f186e',
    '5b6f151c-2097-488a-a07e-3581cf63cf23',
    'f45df364-b419-46c3-96ca-ae8097b296af',
    'b4069df0-9a29-43ae-a4bf-dccf583f358e'
  ];

  const cleanManifest = {};
  for (const id of ORIGINAL_5) {
    if (manifest[id]) cleanManifest[id] = manifest[id];
  }
  const pageOrder = [...ORIGINAL_5];

  const templateMatch = originalLanding.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  let rawTemplate = JSON.parse(templateMatch[1]);
  const boardSections = rawTemplate.match(/<section class="board"[\s\S]*?<\/section>/g) || [];
  const first5Sections = boardSections.slice(0, 5).join('\n');
  const templateHead = rawTemplate.split(/<section class="board"/i)[0];
  let template = templateHead + first5Sections;

  for (const b of boards) {
    pageOrder.push(b.id);
    const gzipped = zlib.gzipSync(Buffer.from(b.html, 'utf8'));
    cleanManifest[b.id] = {
      mime: 'text/html',
      compressed: true,
      data: gzipped.toString('base64')
    };
    template += `\n<section class="board"><h2>${b.title}</h2><iframe src="about:blank#${b.id}" title="${b.title}" width="${b.width}" height="${b.height}" loading="eager" style="width:${b.width}px;height:${b.height}px"></iframe></section>`;
  }
  template += '\n\n\n</body></html>';

  console.log('Total boards in pageOrder:', pageOrder.length);

  // Replace manifest, template, and page_order in originalLanding
  let updatedLanding = originalLanding;
  updatedLanding = updatedLanding.replace(
    /<script type="__bundler\/manifest">[\s\S]*?<\/script>/,
    `<script type="__bundler/manifest">\n${JSON.stringify(cleanManifest)}\n  </script>`
  );
  updatedLanding = updatedLanding.replace(
    /<script type="__bundler\/template">[\s\S]*?<\/script>/,
    `<script type="__bundler/template">\n${JSON.stringify(template)}\n  </script>`
  );
  updatedLanding = updatedLanding.replace(
    /<script type="__bundler\/page_order">[\s\S]*?<\/script>/,
    `<script type="__bundler/page_order">\n${JSON.stringify(pageOrder)}\n  </script>`
  );

  fs.writeFileSync('Nexo · Landing page.html', updatedLanding, 'utf8');
  console.log('SUCCESS: Updated "Nexo · Landing page.html" with all Docente and Dirección boards!');
} else {
  console.error('Failed to parse originalLanding tags');
}

