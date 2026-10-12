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
