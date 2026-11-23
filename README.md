<p align="center">
  <img src="docs/img/nexo-banner-3d.gif" width="100%" alt="Nexo">
</p>

<h1 align="center">Nexo</h1>

<p align="center">
  Plataforma de retroalimentación académica de la Pontificia Universidad Javeriana.<br>
  Los estudiantes reportan cómo les va en cada asignatura y los docentes responden y actúan a tiempo.
</p>

<p align="center">
  <a href="https://nexo-7a24e.web.app"><b>nexo-7a24e.web.app</b></a> ·
  <a href="https://www.figma.com/design/nNU1yd0nPgQySvt6AanQet/Nexo">Prototipo en Figma</a> ·
  Release <b>v1.0</b>
</p>

---

## Contenido

- [Qué es Nexo](#qué-es-nexo)
- [Funcionalidades](#funcionalidades)
- [Novedades de la v1.0](#novedades-de-la-v10)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Cómo correrlo](#cómo-correrlo)
- [Despliegue](#despliegue)
- [Modelo de datos](#modelo-de-datos)
- [API del backend Java](#api-del-backend-java)
- [Historias de usuario](#historias-de-usuario)
- [Estructura del repositorio](#estructura-del-repositorio)

---

## Qué es Nexo

En la mayoría de cursos, el docente se entera de que algo no funciona cuando ya pasó el parcial. Nexo acorta ese ciclo: cada semana el estudiante califica su asignatura por categorías (claridad, explicaciones, evaluación y acompañamiento), el docente recibe el reporte, responde y publica los cambios que hizo, y la dirección del programa ve dónde se concentran las dificultades.

El ciclo completo:

```
Estudiante reporta  →  Docente revisa y responde  →  Docente publica la mejora  →  Estudiante ve el cambio
```

## Funcionalidades

### Estudiante
- Registro con correo `@javeriana.edu.co` y verificación por código enviado al correo.
- Reporte semanal guiado en 7 pasos: asignatura, una pantalla por cada una de las 4 categorías, preguntas sobre la materia y comentarios finales.
- Seguimiento del estado de cada reporte (*Pendiente → En revisión → Atendido*) y la respuesta del docente.
- **Mi historial**: valoración de cada asignatura semana a semana y su tendencia.
- **Mi perfil**: datos de la cuenta y selección de las asignaturas que cursa.
- Cada estudiante nuevo empieza con 3 asignaturas asignadas para poder reportar desde el primer día.

### Docente
- Bandeja de reportes de sus asignaturas, con filtros por estado y asignatura.
- Cambio de estado y **respuesta escrita** al estudiante desde el detalle del reporte.
- Estadísticas: totales por estado, categoría que más preocupa, valoración promedio, reportes por semana y **evolución por categoría**.
- Encuestas y comentarios: resultados por pregunta, comparación entre grupos y comentarios anónimos con búsqueda y temas detectados.
- Publicación de **mejoras** en sus asignaturas, que ven sus estudiantes.

### Dirección de programa
- Panorama semanal del programa con ranking de urgencia por asignatura.
- Detalle de cada grupo con la trazabilidad de sus reportes y contacto directo con el docente.
- Encuestas y comentarios de todo el programa.
- El rol **docente directivo** combina las vistas de docente (sus clases) y de dirección (su sección).

## Novedades de la v1.0

Ajustes hechos después de la validación con usuarios.

| # | Cambio | Qué resuelve |
|---|---|---|
| 1 | **Respuesta del docente** en cada reporte. Al responder, el reporte pasa a *En revisión*. | El cambio de estado no le decía al estudiante qué iba a pasar con lo que reportó. |
| 2 | **Mi perfil** con selección de asignaturas. | Los estudiantes no tenían cómo ver sus datos ni ajustar sus materias. |
| 3 | **"Lo que cambió gracias a tus reportes"**: el docente publica las mejoras aplicadas. | El estudiante no veía resultados de reportar, lo que bajaba la participación. |
| 4 | **Mi historial** semanal del estudiante. | No había forma de ver si una asignatura mejoraba con el tiempo. |
| 5 | **Evolución por categoría** en las estadísticas del docente. | Los promedios del semestre escondían si una categoría iba subiendo o bajando. |

Además, los estudiantes nuevos reciben 3 asignaturas por defecto al registrarse.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 y JavaScript (ES Modules), sin frameworks ni paso de build |
| Autenticación | Firebase Authentication (correo y contraseña, dominio institucional) |
| Base de datos | Cloud Firestore, con actualización en tiempo real (`onSnapshot`) y reglas de seguridad por rol |
| Correo | EmailJS para el código de verificación del registro |
| Hosting | Firebase Hosting |
| Backend (opcional) | Java 17, Maven, Firebase Admin SDK y Gson |
| Diseño | Figma con UI Kit propio. Tipografías Fraunces y Source Sans 3 |

## Arquitectura

```
┌────────────────────────────┐
│  Navegador                 │
│  index.html  (interfaz)    │
│  nexo-api.js (datos)  ─────┼──► 1. Backend Java   localhost:8080/api  (si está corriendo)
└────────────────────────────┘    2. Firebase       Auth + Firestore    (app publicada)
                                  3. Modo demo      datos simulados     (?demo o sin Firebase)
```

`nexo-api.js` elige la fuente de datos en ese orden y normaliza las respuestas, así que la interfaz recibe siempre la misma forma de datos sin importar de dónde vienen.

La seguridad no depende del cliente: `firestore.rules` valida el dominio del correo, impide que un usuario se asigne un rol, exige que el reporte nazca *Pendiente* con al menos 20 caracteres, restringe quién puede cambiar estados y prohíbe borrar reportes.

## Cómo correrlo

### Requisitos
- [Node.js](https://nodejs.org/) 18 o superior
- Firebase CLI: `npm install -g firebase-tools`
- Opcional, para el backend: Java 17 y Maven 3.9 o superior

### 1. Clonar
```bash
git clone https://github.com/valgomezzz/Nexo.git
cd Nexo
```

### 2. Levantar el frontend
```bash
firebase serve --only hosting
```
Abrir `http://localhost:5000`. Por defecto usa el proyecto Firebase configurado en `firebase-config.js`.

### Modo demo (sin cuenta ni conexión a Firebase)
Abrir `http://localhost:5000/?demo`. Carga una simulación con 12 grupos, 6 docentes y cientos de reportes, y acepta cualquier contraseña:

| Rol | Correo |
|---|---|
| Estudiante | `estudiante@javeriana.edu.co` |
| Docente | `profesor@javeriana.edu.co` |
| Dirección | `direccion@javeriana.edu.co` |
| Docente directivo | `jefe@javeriana.edu.co` |

Los cambios del modo demo se guardan en el `localStorage` del navegador.

### 3. Backend Java (opcional)
```bash
cd backend
mvn compile exec:java
```
Queda en `http://localhost:8080/api` (salud: `/api/health`). Si existe `backend/serviceAccountKey.json`, se conecta a Firestore; si no, funciona con datos locales. El frontend lo detecta solo cuando corre en `localhost`.

### Asignar roles
Toda cuenta nueva es de estudiante. Los roles de docente o dirección se asignan con el Admin SDK, porque las reglas no permiten que un usuario cambie su propio rol:

```bash
cd backend
mvn compile exec:java -Dexec.mainClass=co.edu.javeriana.nexo.AsignarRol \
  -Dexec.args="correo@javeriana.edu.co DOCENTE"
```
Roles válidos: `ESTUDIANTE`, `DOCENTE`, `DIRECCION` y `ADMIN`.

## Despliegue

```bash
firebase login
firebase deploy --only hosting,firestore:rules
```

- `hosting` publica la interfaz en `https://nexo-7a24e.web.app`. Qué archivos se excluyen se define en `firebase.json`: backend, documentación y carpetas ocultas.
- `firestore:rules` publica `firestore.rules`. Hay que incluirlo siempre que cambien las reglas.
- Después de desplegar, conviene una recarga forzada (Cmd/Ctrl + Shift + R) para descartar la versión en caché.

### Conversión acumulada de la landing

La sección **Nexo en números** de la landing lee `conversion.json` (raíz del sitio). Para actualizarlo antes de una entrega:

```bash
cd scripts
npm install
node conversion.mjs --dry-run                      # revisar los números sin escribir
node conversion.mjs --visitas 230 --visitas-desde 2026-11-23
cd .. && firebase deploy --only hosting
```

- **Registros, activados, reportes y respondidos** se cuentan en Firestore (`users` y `reports`). Usa `backend/serviceAccountKey.json` o `GOOGLE_APPLICATION_CREDENTIALS`.
- **Visitas** vienen de Google Analytics (evento `landing_view`) y se pasan con `--visitas`. Si quedan en `null`, la landing muestra "En medición".
- Las cuentas del equipo y de prueba se excluyen escribiéndolas en `scripts/cuentas-excluidas.txt` (ver `cuentas-excluidas.ejemplo.txt`; el archivo no se sube).
- Eventos de Analytics: `landing_view`, `cta_click`, `sign_up`, `first_report` y `report_sent`. En modo `?demo` no se registra nada.

## Modelo de datos

Colecciones en Cloud Firestore:

| Colección | Campos principales | Quién escribe |
|---|---|---|
| `users/{uid}` | `email`, `nombre`, `rol`, `subjectIds`, `aCargo`, `createdAt` | El propio usuario, sin poder cambiar `rol` ni `email` |
| `subjects/{id}` | `nombre`, `abreviatura`, `grupo`, `professorUid`, `professorNombre`, `studentUids` | Dirección o administrador |
| `reports/{id}` | `studentUid`, `subjectId`, `professorUid`, `respuestas`, `moods`, `categoria`, `detalle`, `estado`, `historial`, `respuesta`, `createdAt`, `updatedAt` | Lo crea el estudiante; estado y respuesta, el docente a cargo o la dirección. No se borra |
| `mejoras/{id}` | `subjectId`, `professorUid`, `professorNombre`, `texto`, `createdAt` | Docente, solo a su nombre |

Las asignaturas de un estudiante son la unión de las que lo incluyen en `studentUids` (inscripción oficial) y las de `subjectIds` en su perfil (elegidas por él o asignadas al registrarse).

## API del backend Java

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del backend y de la conexión con Firebase |
| `POST` | `/api/auth/login` | Inicio de sesión en modo local |
| `GET` | `/api/me` | Usuario en sesión |
| `GET` | `/api/subjects` | Asignaturas inscritas o a cargo |
| `GET` | `/api/reports` | Reportes visibles según el rol |
| `POST` | `/api/reports` | Crear reporte |
| `PATCH` | `/api/reports/{id}` | Cambiar estado (`pend`, `rev`, `ok`) |
| `GET` | `/api/stats` | Métricas consolidadas |

Con Firebase activo, las rutas protegidas exigen `Authorization: Bearer <ID token de Firebase>`.

## Historias de usuario

| HU | Historia | Estado |
|---|---|---|
| HU-01 | Registro y autenticación institucional con roles | Completa |
| HU-02 | Creación de reportes de dificultades académicas | Completa |
| HU-03 | Gestión y seguimiento de reportes por el docente | Completa, con respuesta escrita desde la v1.0 |
| HU-04 | Resumen consolidado y métricas por asignatura | Completa, con evolución por categoría desde la v1.0 |
| HU-05 | Modelo de datos con integridad, auditoría y trazabilidad | Completa (reglas de Firestore e historial de estados) |

El detalle y los criterios de aceptación están en [`readme_Nexo.md`](readme_Nexo.md).

## Estructura del repositorio

```
Nexo/
├── index.html / Nexo.html   Aplicación (17 pantallas). Hosting sirve Nexo.html; ambos son idénticos
├── nexo-api.js              Capa de datos: backend Java, Firestore o modo demo
├── firebase-config.js       Configuración de Firebase, URL del backend y EmailJS
├── firestore.rules          Reglas de seguridad de Firestore
├── firebase.json            Configuración de Hosting
├── backend/                 API REST en Java 17
│   └── src/main/java/co/edu/javeriana/nexo/
│       ├── NexoServer.java  Servidor HTTP
│       ├── NexoApi.java     Rutas
│       ├── AsignarRol.java  Asignación de roles
│       ├── model/           Usuario, Asignatura, Reporte, Rol, Estado
│       └── service/         Autenticación, asignaturas, reportes y estadísticas
└── docs/img/                Recursos gráficos
```

## Releases y tags

| Tag | Release | Fecha | Contenido |
|---|---|---|---|
| — | Release 1 | 11 oct 2026 | Primera versión pública: 10 pantallas, backend Java con Firebase Admin SDK, Firestore en tiempo real, reglas de seguridad y despliegue en Hosting |
| [`v0.2`](https://github.com/valgomezzz/Nexo/releases/tag/v0.2) | [Release 2](https://github.com/valgomezzz/Nexo/releases/tag/v0.2) | 25 oct 2026 | Formulario de evaluación por categorías con escala de caritas y rol de docente directivo |
| [`v1.0-rc`](https://github.com/valgomezzz/Nexo/releases/tag/v1.0-rc) | [Nexo v1.0-rc](https://github.com/valgomezzz/Nexo/releases/tag/v1.0-rc) *(pre-release)* | 16 nov 2026 | Registro con verificación por EmailJS, encuestas con tipos de respuesta, pantalla de encuestas y comentarios y modo simulación. Documenta los errores conocidos E-01 a E-09 |
| [`v1.0`](https://github.com/valgomezzz/Nexo/tree/v1.0) | v1.0 | 22 nov 2026 | Ajustes post-validación: respuesta del docente, Mi perfil, mejoras publicadas, historial del estudiante y evolución por categoría |

### Qué cambió de v1.0-rc a v1.0

| Commit | Cambio |
|---|---|
| `2278049` | Asignaturas por defecto para estudiantes nuevos. Corrige **E-01**: el estudiante recién registrado ya no queda sin asignaturas |
| `191aaff` | Respuesta del docente a los reportes |
| `dcceb75` | Pantalla Mi perfil y elección de asignaturas |
| `26809de` | Mejoras publicadas por el docente |
| `c961865` | Historial semanal del estudiante |
| `9d815dc` | Evolución por categoría en estadísticas del docente |
| `0920ad6` | Hosting deja de publicar carpetas ocultas (`.git`) |
| `5bbeb62` | README final de la v1.0. Corrige **E-09**: el README ya no describe el Release 1 |

Los errores E-02 a E-08 siguen abiertos y están descritos en el [release v1.0-rc](https://github.com/valgomezzz/Nexo/releases/tag/v1.0-rc).

Todas las versiones: [Releases](https://github.com/valgomezzz/Nexo/releases) · [Tags](https://github.com/valgomezzz/Nexo/tags)

---

<p align="center">Proyecto universitario · Pontificia Universidad Javeriana · 2026-2</p>
