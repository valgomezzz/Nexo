# Nexo — Backend en Java (Firebase)

API REST escrita en **Java 17 + Maven** que corre como **Cloud Function (2.ª gen.)** dentro del proyecto de Firebase.
Usa **Firebase Authentication** para el login y **Cloud Firestore** para guardar los datos.

```
Nexo.html ──(Firebase Auth: login)──► idToken
    │
    └──(fetch + Bearer idToken)──► Cloud Function "api" (Java) ──► Firestore
```

## Endpoints

| Método | Ruta | Rol | HU |
|---|---|---|---|
| GET | `/me` | todos | HU-01 |
| GET | `/subjects` | todos (filtra por rol) | HU-02 |
| GET | `/reports` | todos (filtra por rol) | HU-03 |
| POST | `/reports` | estudiante | HU-02 |
| PATCH | `/reports/{id}` `{ "estado": "pend\|rev\|ok" }` | docente a cargo | HU-03 |
| GET | `/stats?subjectId=&asignatura=&categoria=` | docente, dirección | HU-04 |

## Modelo en Firestore (HU-05)

| Colección | Campos |
|---|---|
| `users/{uid}` | email, nombre, rol (`ESTUDIANTE`/`DOCENTE`/`DIRECCION`/`ADMIN`), createdAt, updatedAt |
| `subjects/{id}` | nombre, abreviatura, grupo, professorUid → users, professorNombre, studentUids[] → users, createdAt, updatedAt |
| `reports/{id}` | studentUid → users, subjectId → subjects, professorUid, moods{metodologia, contenido, ritmo}, comentarios, categoria, titulo, detalle, estado, historial[], createdAt, updatedAt |

- El correo es único porque Firebase Auth no permite dos cuentas con el mismo email, y el id de `users` es el uid.
- La API no deja crear reportes sin estudiante válido ni asignatura existente en la que esté inscrito.
- `firestore.rules` bloquea el acceso directo desde el navegador: todo pasa por la API.

## Configuración (una sola vez)

1. Crea un proyecto en <https://console.firebase.google.com> y activa:
   - **Authentication** → Correo/contraseña.
   - **Firestore Database**.
   - Plan **Blaze**: lo exigen las Cloud Functions (tiene capa gratuita).
2. Registra una **app web** y copia su configuración en [`../firebase-config.js`](../firebase-config.js).
3. Descarga una llave de **cuenta de servicio** (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada).
   Guárdala **fuera del repositorio**.

## Correr en local

```powershell
cd backend
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\a\serviceAccount.json"

mvn compile exec:java   # carga datos de prueba (contraseña: Nexo2026*)
mvn function:run        # API en http://localhost:8080
```

Sirve el frontend por http (los módulos JS no cargan con `file://`), por ejemplo `npx serve ..` y abre `http://localhost:3000/Nexo.html`.

Usuarios de prueba: `mateo.silva@javeriana.edu.co` (estudiante), `maria.garcia@javeriana.edu.co` (docente), `ana.torres@javeriana.edu.co` (dirección).

## Publicar

```powershell
# Backend (requiere Google Cloud CLI: Firebase CLI no publica funciones en Java)
gcloud functions deploy api --gen2 --runtime=java17 --region=us-central1 `
  --source=backend --entry-point=co.edu.javeriana.nexo.NexoApi `
  --trigger-http --allow-unauthenticated --project TU_PROYECTO

# Frontend + reglas
firebase deploy --only hosting,firestore:rules --project TU_PROYECTO
```

`--allow-unauthenticated` solo deja que llegue la petición: la API rechaza cualquier llamada sin un idToken válido de Firebase.

Variables de entorno opcionales: `ALLOWED_DOMAINS` (por defecto `javeriana.edu.co`), `SEMESTER_START` (por defecto `2026-07-27`), `CORS_ORIGIN`.
