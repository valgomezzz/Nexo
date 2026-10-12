<p align="center">
  <img src="docs/img/nexo-banner-3d.gif" width="100%" alt="Logo 3D giratorio de Nexo">
</p>

<h1 align="center">📋 Nexo</h1>

<p align="center">
  Plataforma web donde los estudiantes reportan problemas en sus asignaturas y los docentes les dan seguimiento de forma clara y ordenada.
</p>

<p align="center">
  🔗 <b>URL pública:</b> <a href="https://nexo-7a24e.web.app">https://nexo-7a24e.web.app</a> · 🏷️ <b>Release 1 · tag v0.1</b>
</p>

----

## ✨ Funcionalidades

- 📝 **Gestión de reportes (HU-03):** lista con fecha, asignatura, título, estado y opción para cambiar el estado.
- 📊 **Resumen consolidado (HU-04):** contadores de reportes totales, pendientes, en revisión y atendidos, con filtros por asignatura y categoría.
- 🧭 **Navegación:** Dashboard, Reportes, Asignaturas y Perfil.

## 🎨 Diseño

- Prototipo en [Figma](https://www.figma.com/design/nNU1yd0nPgQySvt6AanQet/Nexo)
- UI Kit propio con paleta de colores, tipografía y componentes reutilizables

## 🛠️ Tecnologías

| Frontend | Backend | Base de datos y autenticación | Diseño |
|---|---|---|---|
| HTML5 | Java 17 | Firebase Authentication | Figma |
| CSS3 (animaciones, 3D, glassmorphism, Grid, Flexbox) | Maven | Cloud Firestore (tiempo real con `onSnapshot`) | UI Kit propio |
| JavaScript vanilla (ES Modules) | API REST (`/api/health`, `/auth/login`, `/subjects`, `/reports`) | Firebase Hosting | Google Fonts (Fraunces y Source Sans 3) |
| Fetch API + AbortController | Autenticación con ID token de Firebase (Bearer) | Firebase Web SDK 10.12.2 | Íconos y logo en SVG |
| IntersectionObserver y localStorage | | localStorage como modo demo sin conexión | |

## 🚀 Cómo ejecutarlo

### Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (incluye `npm`)
- [Git](https://git-scm.com/)

### Pasos

**Frontend con Firebase real** (desde la raíz del proyecto):
```bash
firebase serve --only hosting
```
y abrir `http://localhost:5000`

**Backend Java opcional** (desde `backend/`):
```bash
mvn compile exec:java
```

## 📌 Estado del proyecto

**Release 1 (v0.1)**

- [x] Prototipos en Figma
- [x] UI Kit (colores, tipografía y componentes)
- [x] Navegación entre 10 pantallas
- [x] Gestión de reportes y resumen consolidado (HU-03, HU-04)
- [x] Frontend desplegado en URL pública ([nexo-7a24e.web.app](https://nexo-7a24e.web.app))
- [x] Conexión con Firebase Authentication y Cloud Firestore
- [x] Backend REST en Java 17 con Firebase Admin SDK (opcional)
- [ ] Validación con usuarios reales (12 al 25 de octubre)

**Próximos pasos:** Release 2 (25 de octubre) con ajustes post-validación y consolidación de persistencia.

---

# 📖 Documentación técnica

Interfaz web (HTML + JavaScript) conectada a **Firebase** (Authentication y Cloud Firestore), con un backend opcional en **Java 17 + Firebase Admin SDK**.

## 🛠️ Estructura

### 🌐 Frontend
- [`Nexo.html`](Nexo.html) / [`index.html`](index.html): aplicación con las **10 pantallas** (landing, login y paneles de estudiante, docente y dirección).
- [`nexo-api.js`](nexo-api.js): capa de datos. Usa el backend Java si está corriendo en `http://localhost:8080/api`; si no, se conecta directo a Firestore. Normaliza los datos para que la interfaz reciba siempre la misma forma.
- [`firebase-config.js`](firebase-config.js): configuración del proyecto Firebase (`nexo-7a24e`).
- [`firestore.rules`](firestore.rules): reglas de seguridad de Cloud Firestore.
- [`firebase.json`](firebase.json) / [`.firebaserc`](.firebaserc): configuración de Firebase Hosting.

### ☕ Backend en Java ([`backend/`](backend))
- [`pom.xml`](backend/pom.xml): Maven con Java 17, `firebase-admin` y `gson`.
- [`NexoServer.java`](backend/src/main/java/co/edu/javeriana/nexo/NexoServer.java): servidor HTTP (`http://localhost:8080`).
- [`NexoApi.java`](backend/src/main/java/co/edu/javeriana/nexo/NexoApi.java): rutas REST.
- [`model/`](backend/src/main/java/co/edu/javeriana/nexo/model) y [`service/`](backend/src/main/java/co/edu/javeriana/nexo/service): dominio y lógica (autenticación, asignaturas, reportes y estadísticas).
- [`AsignarRol.java`](backend/src/main/java/co/edu/javeriana/nexo/AsignarRol.java): utilidad para asignar los roles DOCENTE / DIRECCION.

## 📡 Endpoints de la API Java

| Método | Endpoint | Descripción | Criterio |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del backend y de Firebase | Salud de la API |
| `GET` | `/api/me` | Usuario en sesión | **HU-01** |
| `GET` | `/api/subjects` | Asignaturas inscritas o a cargo | **HU-02** / **HU-03** |
| `GET` | `/api/reports` | Reportes según el rol | **HU-03** |
| `POST` | `/api/reports` | Crear reporte (mensaje de mínimo 20 caracteres) | **HU-02** |
| `PATCH` | `/api/reports/{id}` | Cambiar estado (`pend`, `rev`, `ok`) | **HU-03** |
| `GET` | `/api/stats` | Métricas consolidadas | **HU-04** |

Con Firebase activo, las rutas protegidas requieren el ID token de Firebase (`Authorization: Bearer <token>`).

## 📱 Pantallas (10)

1. **Landing:** logo 3D giratorio y "Así funciona" en 3 pasos que aparecen al hacer scroll.
2. **Iniciar sesión:** correo institucional `@javeriana.edu.co`; el rol se toma del perfil en Firestore.
3. **Estudiante · Mis asignaturas:** asignaturas de la semana por reportar y reportes recientes con su estado.
4. **Estudiante · Nuevo reporte:** asistente de 5 pasos (asignatura, metodología, contenido, ritmo con escala de 5 caritas y mensaje).
5. **Estudiante · Reporte enviado:** comprobante con valoraciones, fecha y estado.
6. **Docente · Reportes recibidos:** filtros por estado y asignatura, y cambio de estado desde cada reporte (HU-03).
7. **Docente · Estadísticas:** totales, categorías, valoración promedio, reportes por semana y urgencia por asignatura (HU-04).
8. **Docente · Mis asignaturas:** asignaturas a cargo con sus pendientes.
9. **Dirección · Panorama semanal:** consolidado del programa y ranking de urgencia.
10. **Dirección · Detalle de grupo:** trazabilidad de los reportes de un grupo.

Cualquier reporte se puede abrir en una ventana de **solo lectura** con su detalle completo y su seguimiento.

## 👥 Cuentas de prueba (modo demo local)

Cuando Firebase no está configurado, la app funciona con datos de demostración y acepta cualquier contraseña con estas cuentas:

| Rol | Correo |
| :--- | :--- |
| Estudiante | `estudiante@javeriana.edu.co` |
| Docente | `profesor@javeriana.edu.co` |
| Dirección | `direccion@javeriana.edu.co` |

En la app publicada se usan las cuentas reales de Firebase Authentication.

---

<p align="center">Proyecto universitario · MVP 2026-2</p>
