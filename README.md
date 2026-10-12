<h1 align="center">📋 Nexo</h1>

<p align="center">
  Plataforma web donde los estudiantes reportan problemas en sus asignaturas y los docentes les dan seguimiento de forma clara y ordenada.
</p>

<p align="center">
  🔗 <b>URL pública:</b> <a href="PEGAR_URL_AQUI">PEGAR_URL_AQUI</a> · 🏷️ <b>Release 1 · tag v0.1</b>
</p>

---

## ✨ Funcionalidades

- 📝 **Gestión de reportes (HU-03):** lista con fecha, asignatura, título, estado y opción para cambiar el estado.
- 📊 **Resumen consolidado (HU-04):** contadores de reportes totales, pendientes, en revisión y atendidos, con filtros por asignatura y categoría.
- 🧭 **Navegación:** Dashboard, Reportes, Asignaturas y Perfil.

## 🎨 Diseño

- Prototipo en [Figma](https://www.figma.com/design/nNU1yd0nPgQySvt6AanQet/Nexo)
- UI Kit propio con paleta de colores, tipografía y componentes reutilizables

## 🛠️ Tecnologías

| Frontend | Diseño | Backend |
|---|---|---|
| React + TypeScript | Figma | En desarrollo |

## 🚀 Cómo ejecutarlo

### Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (incluye `npm`)
- [Git](https://git-scm.com/)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/valgomezzz/Nexo.git
cd Nexo

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Abre en el navegador la dirección que aparece en la terminal (normalmente `http://localhost:5173`).

No necesita variables de entorno ni base de datos: en este release el backend aún está en desarrollo.

### Otros comandos

```bash
npm run build     # genera la versión de producción en /dist
npm run preview   # sirve localmente la versión de producción
```

## 📌 Estado del proyecto

**Release 1 (v0.1)**

- [x] Prototipos en Figma
- [x] UI Kit (colores, tipografía y componentes)
- [x] Navegación entre pantallas
- [x] Gestión de reportes y resumen consolidado (HU-03, HU-04)
- [x] Frontend desplegado en URL pública
- [ ] Backend y base de datos
- [ ] Validación con usuarios reales (12 al 25 de octubre)

**Próximos pasos:** Release 2 (25 de octubre) con los ajustes post-validación, backend y persistencia de datos.

---

<p align="center">Proyecto universitario · MVP 2026-2</p>
