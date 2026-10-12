# Nexo

Plataforma web para que los estudiantes reporten problemas en sus asignaturas
y los docentes les den seguimiento de forma ordenada.

> MVP del semestre — [Nombre de la materia], [Universidad], 2026-2

## El problema
2–3 líneas: qué pasa hoy con los reportes/quejas de estudiantes y por qué
se pierden o no se atienden.

## La solución
Qué hace Nexo en una frase + los roles (estudiante, profesor).

## Funcionalidades (MVP)
- **HU-03 – Gestión de reportes:** lista con fecha, asignatura, título,
  estado y cambio de estado.
- **HU-04 – Resumen consolidado:** contadores de total, pendientes,
  en revisión y atendidos, filtrables por asignatura y categoría.
- Navegación: Dashboard, Reportes, Asignaturas, Perfil.

## Capturas
![Panel de Reportes](docs/img/panel-reportes.png)

## Diseño
- Prototipo en Figma: https://www.figma.com/design/nNU1yd0nPgQySvt6AanQet/Nexo
- UI Kit propio (paleta, tipografía, botones, componentes)
- Microinteracción de cambio de estado: loader → resaltado → toast

## Stack
- React + TypeScript
- [Vite / CRA], [React Router], [librería de estilos]
- Backend y base de datos: *pendiente (fase final del proyecto)*

## Cómo correrlo
```bash
git clone https://github.com/<usuario>/nexo.git
cd nexo
npm install
npm run dev
```

## Estructura del proyecto

---

# Documentación técnica

**App publicada:** https://nexo-7a24e.web.app

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

## 🚀 Cómo ejecutarlo

**Frontend con Firebase real** (desde la raíz del proyecto):
```bash
firebase serve --only hosting
```
y abrir http://localhost:5000

**Backend Java** (opcional, desde `backend/`):
```bash
mvn compile exec:java
```
Para que use Cloud Firestore necesita `backend/serviceAccountKey.json` (Consola de Firebase → Cuentas de servicio). **Ese archivo nunca se sube al repositorio** (está en `.gitignore`). Sin la clave, el backend funciona en modo de datos simulados.

**Asignar roles** (con la clave instalada; la persona debe haber iniciado sesión una vez):
```bash
mvn -q compile exec:java "-Dexec.mainClass=co.edu.javeriana.nexo.AsignarRol" "-Dexec.args=correo@javeriana.edu.co DOCENTE"
```

**Publicar:**
```bash
firebase deploy --only hosting
```

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

## 👥 Cuentas de prueba (solo modo demo local)

Cuando Firebase no está configurado, la app funciona con datos de demostración y acepta cualquier contraseña con estas cuentas:

| Rol | Correo |
| :--- | :--- |
| Estudiante | `estudiante@javeriana.edu.co` |
| Docente | `profesor@javeriana.edu.co` |
| Dirección | `direccion@javeriana.edu.co` |

En la app publicada se usan las cuentas reales de Firebase Authentication.
