# Nexo - Sistema de Feedback y Reporte de Barreras Académicas (PUJ)
### Backend as a Service 100% Firebase & Frontend Interactivo

Este repositorio contiene la implementación completamente funcional de **Nexo**, la plataforma de feedback académico de la Pontificia Universidad Javeriana (PUJ).

La arquitectura ha sido diseñada para conectarse **exclusivamente con Firebase**, eliminando la necesidad de servidores intermedios en Java, Express u otros frameworks. Utiliza **Firebase Authentication**, **Cloud Firestore (en tiempo real)**, **Reglas de Seguridad declarativas** y **Firebase Hosting**.

---

## 🚀 Estructura del Proyecto

- [`Nexo.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/Nexo.html): Aplicación web interactiva completa que integra y navega entre las **10 pantallas del sistema**.
- [`index.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/index.html): Punto de entrada idéntico para despliegues en servidores web o Firebase Hosting.
- [`tablero-mockups.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/tablero-mockups.html): Tablero de diseño original con los 10 lienzos exportados del prototipo.
- [`nexo-api.js`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/nexo-api.js): **Motor Backend en Firebase** (Auth, Firestore en tiempo real `onSnapshot`, mutaciones, auditoría y recálculo de métricas reactivas).
- [`firebase-config.js`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/firebase-config.js): Parámetros de conexión del proyecto Firebase (`nexo-7a24e`).
- [`firestore.rules`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/firestore.rules): **Reglas de seguridad estrictas de Cloud Firestore**, garantizando validación de roles, dominios institucionales e inmutabilidad de auditoría.
- [`firebase.json`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/firebase.json): Configuración de reglas y hosting para Firebase CLI.
- [`readme_Nexo.md`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/readme_Nexo.md): Requerimientos y criterios de aceptación originales (HU-01 a HU-05).

---

## 📱 Pantallas Implementadas y Funcionales (10)

1. **Landing (Inicio):** Hero con tipografía *Fraunces*, logotipo 3D interactivo animado por órbitas y el flujo de feedback en 3 pasos.
2. **Iniciar Sesión:** Formulario de autenticación con selector de rol (*Estudiante*, *Docente*, *Dirección*), validación estricta de correo `@javeriana.edu.co` y botones de acceso rápido demo.
3. **Estudiante · Mis Asignaturas:** Catálogo de cursos matriculados con profesor, grupo y acceso directo para emitir reportes.
4. **Estudiante · Nuevo Reporte:** Formulario interactivo con evaluación de *Metodología*, *Contenido* y *Ritmo*, y validación en tiempo real de longitud mínima (mínimo 20 caracteres por criterio HU-02).
5. **Estudiante · Reporte Enviado:** Pantalla de confirmación con folio, fecha/hora registrada y estado inicial `Pendiente`.
6. **Docente · Reportes Recibidos:** Panel con pestañas filtrables (*Todos*, *Pendientes*, *En revisión*, *Atendidos*) y selector interactivo para modificar el estado en Firestore en tiempo real.
7. **Docente · Estadísticas y Métricas:** Métricas cuantitativas consolidadas y gráficos dinámicos que se recalculan automáticamente ante cualquier cambio de estado.
8. **Docente · Mis Asignaturas:** Cursos a cargo del docente con estadísticas de estudiantes y reportes recibidos.
9. **Dirección · Panorama Semanal:** Vista gerencial y consolidada para decanaturas y directores de carrera.
10. **Dirección · Detalle de Grupo:** Análisis en profundidad de un grupo específico y sus dificultades pedagógicas.

---

## 👥 Cuentas de Demostración Preconfiguradas

En la pantalla de inicio de sesión puedes hacer clic en los botones de prueba o ingresar manualmente:

| Rol | Correo Institucional | Contraseña | Nombre |
| :--- | :--- | :--- | :--- |
| **Estudiante** | `estudiante@javeriana.edu.co` | `clave123` | Ana María Ruiz |
| **Docente** | `profesor@javeriana.edu.co` | `clave123` | Dr. Carlos Mendoza |
| **Dirección** | `direccion@javeriana.edu.co` | `clave123` | Dra. Elena Gómez |

---

## 🛡️ Cumplimiento de Historias de Usuario (HU)

- **HU-01 (Registro y autenticación con roles):** Validación de dominio `@javeriana.edu.co`, redirección inteligente según rol del usuario y sesión segura con Firebase Auth.
- **HU-02 (Creación de reportes):** Asignación obligatoria a una materia válida, contador interactivo con validación de >= 20 caracteres y estado inicial automático `PENDIENTE`.
- **HU-03 (Gestión de reportes docente):** Suscripción reactiva `onSnapshot` a Firestore. Los cambios de estado entre `Pendiente`, `En revisión` y `Atendido` se sincronizan instantáneamente.
- **HU-04 (Métricas consolidadas):** Recálculo automático de totales, pendientes, atendidos y distribución por categorías con soporte para estado vacío.
- **HU-05 (Integridad referencial y persistencia):** Reglas de seguridad en `firestore.rules` que impiden la eliminación de reportes, aseguran llaves foráneas (`studentUid`, `subjectId`, `professorUid`) y validan tipos de datos.

---

## 🌐 ¿Cómo Ejecutar y Probar?

Simplemente abre el archivo [`Nexo.html`](file:///c:/Users/vanva/.gemini/antigravity-ide/scratch/mi-workspace/Van%20Workspace/Proyecto_Innovación/Nexo.html) en tu navegador preferido (Google Chrome, Edge, Safari, Firefox).

Para desplegarlo a Firebase Hosting con un solo comando:
```bash
npx firebase-tools deploy
```
