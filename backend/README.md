# Nexo Backend (Java 17 + Firebase Admin SDK)
### Pontificia Universidad Javeriana (PUJ)

Servidor de API REST implementado en **Java 17 (Eclipse Adoptium Temurin)** con **Firebase Admin SDK** y **Cloud Firestore**.

---

## 🛠️ Requisitos
- **Java 17** o superior (`java -version`).
- **Apache Maven 3.9+** (`mvn -version`).

---

## 🚀 Inicio Rápido

Desde la raíz del proyecto o dentro de la carpeta `backend`:
```powershell
# Opción 1: Ejecutar directamente con Maven
mvn compile exec:java

# Opción 2: Usar el script de PowerShell
.\start-backend.ps1
```

El servidor quedará activo en:
`http://localhost:8080`

Endpoint de verificación:
`http://localhost:8080/api/health`

---

## 📡 Endpoints Disponibles

| Método | Endpoint | Descripción | Criterio HU |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del backend y de Firebase | Salud de la API |
| `POST` | `/api/auth/login` | Login institucional (`@javeriana.edu.co`) | HU-01 |
| `GET` | `/api/me` | Información del perfil del usuario activo | HU-01 |
| `GET` | `/api/subjects` | Asignaturas inscritas o a cargo | HU-02 / HU-03 |
| `GET` | `/api/reports` | Listado de reportes según rol | HU-03 |
| `POST` | `/api/reports` | Creación de reporte (mínimo 20 caracteres) | HU-02 |
| `PATCH` | `/api/reports/{id}` | Cambio de estado (`pend`, `rev`, `ok`) | HU-03 |
| `GET` | `/api/stats` | Métricas y analítica pedagógica reactiva | HU-04 |

---

## ☁️ Conexión con Firebase Cloud

El backend cuenta con **detección automática inteligente**:
1. Si agregas el archivo `serviceAccountKey.json` en esta carpeta `backend/` (descargado desde la Consola de Firebase > Cuentas de servicio), el backend sincroniza directamente con **Cloud Firestore** en Google Cloud.
2. Si no tienes la clave privada localmente, el backend funciona en **Modo Local Mock** con datos precargados de la Javeriana, asegurando que la aplicación nunca falle ni requiera configuración obligatoria previa.
