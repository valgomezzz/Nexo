# Nexo - Sistema de Feedback y Reporte de Barreras Académicas (PUJ)
### Backend en Java 17 + Firebase Admin SDK & Frontend Interactivo

Este repositorio contiene la implementación completamente funcional de **Nexo**, la plataforma de feedback académico de la Pontificia Universidad Javeriana (PUJ).

El backend está desarrollado en **Java 17 (Temurin)** con **Firebase Admin SDK** y **Cloud Firestore**, acompañado de una interfaz web reactiva de alta fidelidad que implementa las 10 pantallas del sistema.

---

## 🛠️ Estructura del Proyecto

### ☕ Backend en Java ([`backend/`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend))
- [`backend/pom.xml`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/pom.xml): Configuración Maven con Java 17, `firebase-admin`, `gson` y plugins de ejecución.
- [`backend/src/main/java/co/edu/javeriana/nexo/NexoServer.java`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/src/main/java/co/edu/javeriana/nexo/NexoServer.java): Servidor HTTP autónomo (`http://localhost:8080`) con soporte CORS completo.
- [`backend/src/main/java/co/edu/javeriana/nexo/NexoApi.java`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/src/main/java/co/edu/javeriana/nexo/NexoApi.java): Despachador de rutas REST y controlador principal.
- [`backend/src/main/java/co/edu/javeriana/nexo/model/`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/src/main/java/co/edu/javeriana/nexo/model): Records del dominio (`Usuario`, `Rol`, `Asignatura`, `Reporte`, `Estado`).
- [`backend/src/main/java/co/edu/javeriana/nexo/service/`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/src/main/java/co/edu/javeriana/nexo/service): Lógica de negocio para autenticación (`AuthService`), materias (`SubjectService`), reportes (`ReportService`) y analítica consolidada (`StatsService`).
- [`backend/src/main/java/co/edu/javeriana/nexo/support/Firebase.java`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/src/main/java/co/edu/javeriana/nexo/support/Firebase.java): Inicializador dual de Firebase Admin SDK (Cloud Firestore y Modo Mock Seguro).
- [`backend/start-backend.ps1`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/backend/start-backend.ps1): Script PowerShell para iniciar el backend con un clic.

### 🌐 Frontend & Integración
- [`Nexo.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/Nexo.html) / [`index.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/index.html): Aplicación web interactiva que navega entre las **10 pantallas del sistema**.
- [`nexo-api.js`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/nexo-api.js): Cliente puente que conecta el frontend con el servidor Java (`http://localhost:8080/api`) y sincroniza con Firebase.
- [`firebase-config.js`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/firebase-config.js): Configuración del proyecto Firebase (`nexo-7a24e`) y URL base del backend Java.
- [`firestore.rules`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/firestore.rules): Reglas declarativas de seguridad de Cloud Firestore.

---

## 🚀 ¿Cómo Ejecutar el Backend en Java?

Abre una terminal PowerShell en la carpeta `backend` y ejecuta:

```powershell
mvn compile exec:java
```
O usando el script de inicio:
```powershell
.\start-backend.ps1
```

El servidor quedará activo en: **`http://localhost:8080`**

### Verificación de Salud
```powershell
curl http://localhost:8080/api/health
```
Respuesta:
```json
{
  "status": "ok",
  "service": "Nexo Backend (Java 17)",
  "firebaseCloud": false,
  "timestamp": 1791762268396
}
```

---

## 📡 Endpoints de la API Java

| Método | Endpoint | Descripción | Criterio |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del backend y de Firebase | Salud de la API |
| `POST` | `/api/auth/login` | Login institucional con verificación de `@javeriana.edu.co` | **HU-01** |
| `GET` | `/api/me` | Información del usuario en sesión | **HU-01** |
| `GET` | `/api/subjects` | Asignaturas inscritas o a cargo | **HU-02** / **HU-03** |
| `GET` | `/api/reports` | Listado de reportes según rol | **HU-03** |
| `POST` | `/api/reports` | Creación de reporte (validación $\ge$ 20 caracteres) | **HU-02** |
| `PATCH` | `/api/reports/{id}` | Cambio de estado (`pend`, `rev`, `ok`) con trazabilidad | **HU-03** |
| `GET` | `/api/stats` | Métricas y analítica pedagógica reactiva | **HU-04** |

---

## 📱 Pantallas Implementadas (10)

1. **Landing (Inicio):** Hero institucional con logotipo 3D y flujo de retroalimentación en 3 pasos.
2. **Iniciar Sesión:** Acceso con rol de Estudiante, Docente o Dirección, validación de correo PUJ y accesos directos demo.
3. **Estudiante · Mis Asignaturas:** Catálogo de cursos matriculados con profesor, grupo y botón de reporte.
4. **Estudiante · Nuevo Reporte:** Formulario interactivo con evaluación de Metodología, Contenido y Ritmo, con contador de caracteres (mínimo 20 por HU-02).
5. **Estudiante · Reporte Enviado:** Confirmación con folio, fecha/hora y estado `Pendiente`.
6. **Docente · Reportes Recibidos:** Pestañas filtrables (*Todos*, *Pendientes*, *En revisión*, *Atendidos*) y selector interactivo para modificar el estado en Java/Firestore en tiempo real (HU-03).
7. **Docente · Estadísticas y Métricas:** Métricas cuantitativas consolidadas y gráficos dinámicos con recálculo automático ante cualquier cambio (HU-04).
8. **Docente · Mis Asignaturas:** Asignaturas a cargo del docente con estadísticas de estudiantes y reportes.
9. **Dirección · Panorama Semanal:** Visión macro y alertas tempranas de asignaturas.
10. **Dirección · Detalle de Grupo:** Análisis en profundidad de grupos específicos y motivos de dificultad.

---

## 👥 Cuentas de Prueba Preconfiguradas

| Rol | Correo Institucional | Contraseña | Nombre |
| :--- | :--- | :--- | :--- |
| **Estudiante** | `estudiante@javeriana.edu.co` | `clave123` | Ana María Ruiz |
| **Docente** | `profesor@javeriana.edu.co` | `clave123` | Dr. Carlos Mendoza |
| **Dirección** | `direccion@javeriana.edu.co` | `clave123` | Dra. Elena Gómez |
