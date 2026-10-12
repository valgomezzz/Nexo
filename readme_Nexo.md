<p align="center">
  <img src="docs/img/nexo-banner-3d.gif" width="100%" alt="Logo 3D giratorio de Nexo">
</p>

# Nexo - Sistema de Feedback y Reporte de Barreras Académicas (PUJ)

## 📌 Descripción del Proyecto
Plataforma web dirigida a la comunidad universitaria de la Pontificia Universidad Javeriana (PUJ)[cite: 2]. Su objetivo principal es permitir a los estudiantes reportar de forma ágil y oportuna las dificultades o barreras académicas que enfrentan en sus asignaturas[cite: 2]. A su vez, permite que los profesores den seguimiento a los reportes, actualicen su estado y consulten métricas consolidadas en tiempo real[cite: 2].

---

## 👥 Roles de Usuario y Flujos
1. **Estudiante:**
   - Inicia sesión con credenciales institucionales[cite: 1, 2].
   - Crea reportes de dificultades académicas seleccionando sus asignaturas inscritas[cite: 1, 2].
   - Hace seguimiento del estado de sus reportes[cite: 2].
2. **Profesor/Docente:**
   - Inicia sesión y accede al panel de control de sus asignaturas a cargo[cite: 1, 2].
   - Visualiza la lista de reportes asociados a sus materias y actualiza su estado individualmente[cite: 1, 2].
   - Consulta un resumen consolidado con métricas y contadores por materia o categoría[cite: 1, 2].
3. **Administrador del Sistema:**
   - Vela por la integridad referencial, normalización del modelo relacional y la persistencia de datos[cite: 1].

---

## 📋 Historias de Usuario (HU)

### HU-01: Registro y autenticación con roles
* **Enunciado:** Como estudiante/profesor, quiero iniciar sesión en la plataforma con mis credenciales y rol correspondiente para acceder a las vistas y funciones específicas para mi perfil[cite: 1].
* **Criterios de Aceptación:**
  - Login obligatorio con correo institucional (dominio PUJ / Outlook) y contraseña[cite: 1].
  - Redirección según rol: Estudiantes hacia el formulario/seguimiento de reportes; Profesores hacia el panel de asignaturas[cite: 1, 2].
  - Validación de credenciales erróneas o fuera del dominio institucional[cite: 1].

### HU-02: Creación de reportes de dificultades académicas
* **Enunciado:** Como estudiante quiero crear y enviar un reporte describiendo una dificultad académica en una asignatura específica, para comunicar al docente problemas que afectan mi proceso de aprendizaje[cite: 1].
* **Criterios de Aceptación:**
  - Selección de asignatura mediante lista desplegable con las materias cursadas por el estudiante[cite: 1].
  - Campo de descripción con validación de longitud mínima (mínimo 20 palabras/caracteres)[cite: 1, 2].
  - Estado inicial automático en "Pendiente", registrando fecha y hora[cite: 1, 2].
  - Notificación/mensaje de confirmación de envío exitoso[cite: 1, 2].

### HU-03: Gestión y seguimiento de reportes (Panel Docente)
* **Enunciado:** Como profesor de una asignatura, quiero visualizar los reportes generados por los estudiantes, para dar seguimiento oportuno y generar cambios de mejora en base a las reseñas[cite: 1].
* **Criterios de Aceptación:**
  - Lista exclusiva de reportes pertenecientes a asignaturas a cargo del docente autenticado[cite: 1, 2].
  - Detalle visible por reporte: fecha, asignatura, título/extracto del problema y estado actual[cite: 1, 2].
  - Modificación reactiva del estado entre: `Pendiente`, `En revisión` y `Atendido` sin requerir recarga completa de la página[cite: 1, 2].

### HU-04: Resumen consolidado y métricas por asignatura
* **Enunciado:** Como profesor de asignatura, quiero consultar un resumen consolidado con el total y estado de los reportes de mis materias, para dimensionar de forma rápida el nivel de dificultad que presenta el grupo durante el semestre[cite: 1].
* **Criterios de Aceptación:**
  - Bloque de métricas/contadores numéricos: Total recibidos, Pendientes, En revisión y Atendidos[cite: 1, 2].
  - Capacidad de filtrar métricas por asignatura o categoría[cite: 1, 2].
  - Manejo de estados vacíos con el mensaje "Sin reportes registrados"[cite: 1, 2].
  - Recálculo reactivo automático ante nuevos reportes o cambios de estado[cite: 1, 2].

### HU-05: Esquema de base de datos relacional y persistencia
* **Enunciado:** Como administrador del sistema quiero un esquema de base de datos relacional normalizado para usuarios, asignaturas y reportes, para asegurar la persistencia, integridad referencial y trazabilidad de toda la información transaccional del sistema[cite: 1].
* **Criterios de Aceptación:**
  - Tablas dedicadas para usuarios, roles, asignaturas y reportes vinculadas por llaves foráneas[cite: 1].
  - Reglas de integridad referencial que impidan reportes sin estudiante emisor válido o sin asignatura asignada[cite: 1].
  - Campos de auditoría obligatorios (`created_at`, `updated_at`)[cite: 1, 2].
  - Restricción de unicidad (`UNIQUE`) en el campo de correo electrónico institucional[cite: 1, 2].

---

## 🛠️ Stack Tecnológico y Arquitectura
* **Diseño y Prototipado:** Figma (Sistema de diseño "Nexo")[cite: 2].
* **Backend as a Service (BaaS):** Firebase[cite: 2].
  - **Firebase Authentication:** Manejo de sesiones y credenciales institucionales[cite: 2].
  - **Cloud Firestore / Base de datos:** Persistencia en tiempo real e integridad transaccional[cite: 2].
  - **Cloud Functions:** Funciones serverless para eventos y lógica backend[cite: 2].
  - **Firebase Hosting:** Despliegue del cliente web[cite: 2].

---

## 🚀 Estado Actual
* Requisitos y criterios de aceptación definidos[cite: 2].
* Maquetación y diseño de pantallas del MVP completadas en Figma (Login, Vista de Reportes para Estudiante y Panel Consolidado/Docente)[cite: 2].
* Fase siguiente: Configuración del entorno de base de datos y desarrollo de la aplicación[cite: 2].