# SprintCUC — Gestión de proyectos de software bajo Scrum

Reto 24 h · Colegio Universitario de Cartago · Administración y Programación de Sitios Web
Profesor: MGP. Roberto Soto Morales · Cuatrimestre 2-2026

> **Product Goal:** permitir que un Scrum Team ejecute y evidencie un Sprint completo desde el teléfono, respetando las responsabilidades reales de cada rol.

---

## 1. Qué hay en este repositorio

Aplicación completa: base de datos, API y PWA móvil.

```
├── server.js              Express: sirve la API y el build del frontend
├── db.js                  Pool de PostgreSQL + logStatus()
├── middleware/auth.js     JWT + requireRole()  ← el corazón del criterio 1
├── routes/                12 routers
├── database/
│   ├── schema.sql         19 tablas
│   └── seed.sql           Sprint 1 cerrado + Sprint 2 activo
├── frontend/              PWA React + Vite + Tailwind
│   └── src/
│       ├── api/client.js       cliente de la API
│       ├── context/            sesión y producto activo
│       ├── components/         Layout, UI compartida
│       └── pages/              12 pantallas del flujo Scrum
├── tests/api.mjs          63 pruebas de extremo a extremo
├── scripts/copy-build.mjs Copia el build a public/
└── render.yaml            Infraestructura como código
```

### Pantallas

| Ruta | Qué hace |
|---|---|
| `/login` | Acceso, con botones de acceso rápido por rol para la demostración |
| `/` | Dashboard: Product Goal, Sprint Goal, avance, bloqueos, velocidad |
| `/backlog` | Product Backlog. **Arrastre para priorizar** (solo PO), estimar (solo DEV), filtros |
| `/historia/:id` | Historia con criterios de aceptación, tareas y **checklist de DoD** |
| `/sprint` | Lista de Sprints, crear e iniciar (SM) |
| `/planning/:id` | Sprint Planning: capacidad del equipo y selección del trabajo (DEV) |
| `/tablero` | Tablero de 5 columnas, arrastre y actualización cada 8 s |
| `/daily` | Daily Scrum con las tres preguntas; genera impedimentos |
| `/impedimentos` | Seguimiento con responsable, criticidad y antigüedad |
| `/cierre` | Incremento, Sprint Review y Retrospective + cierre del Sprint |
| `/metricas` | Burndown, Velocity y cumplimiento |
| `/equipo` | Scrum Team, capacidad, DoD y matriz de responsabilidades |

## 2. Stack

| Capa | Tecnología |
|---|---|
| Backend | Node 20 + Express 4 |
| Base de datos | PostgreSQL (gestionada por Render) |
| Autenticación | JWT en cookie `httpOnly` + bcrypt |
| Frontend | React 18 + Vite + Tailwind (build estático servido por Express) |
| Despliegue | Un solo Web Service en Render, auto-deploy desde `main` |

**Por qué Node y no PHP:** el despliegue autorizado es Render, que tiene runtime nativo de Node. Servir PHP habría exigido un `Dockerfile` con nginx + php-fpm sin aportar nada al producto.

**Por qué JWT y no `express-session`:** el plan gratuito de Render duerme el servicio tras 15 minutos de inactividad y lo reinicia. Un almacén de sesiones en memoria las perdería todas en cada reinicio. El JWT vive en el navegador y sobrevive.

**Por qué no hay adjuntos de archivos:** el sistema de archivos de Render es efímero — todo lo subido desaparece en el siguiente despliegue. Las HU-017, 034, 092 y 126 quedaron fuera de alcance por esa razón técnica, no por falta de tiempo.

---

## 3. Puesta en marcha

### Local

Requisitos: **Node 20 o superior** y una base PostgreSQL (la de Render sirve; no hace falta instalar PostgreSQL en su computadora).

```bash
npm install                   # dependencias del backend
npm install --prefix frontend # dependencias del frontend

# 1. Copiar .env.example a .env y pegar la EXTERNAL Database URL de Render
# 2. Cargar el esquema y los datos de prueba (no necesita psql):
npm run db:setup

# 3. Levantar, en dos terminales:
npm run dev                   # backend  -> http://localhost:3000
npm run dev:front             # frontend -> http://localhost:5173
```

Abra **http://localhost:5173**. Vite reenvía `/api` al backend, así que no hay CORS.

`npm run db:seed` recarga solo los datos de prueba (útil después de correr `npm test`).

Durante el desarrollo se trabaja contra `http://localhost:5173`; Vite reenvía `/api` al backend, así que no hay CORS. Para probar la versión final tal como se verá en Render:

```bash
npm run build                 # compila el frontend y lo copia a public/
npm start                     # todo servido desde http://localhost:3000
```

### Render

1. **New → PostgreSQL** · nombre `sprintcuc-db` · plan Free · anotar la región.
2. Cargar el esquema desde su computadora, con la **External Database URL** en `.env`:
   ```bash
   npm run db:setup
   ```
3. **New → Web Service** · conectar el repo · Runtime **Node** · misma región que la base.
   - Build: `npm install && npm run build`
   - Start: `npm start`
4. Variables: `DATABASE_URL` (la **Internal**, o enlazarla con *Add from Database*), `JWT_SECRET`, `NODE_ENV=production`, `NODE_VERSION=20`.
5. Verificar `https://<app>.onrender.com/api/ping` → `{"ok":true,"db":1}`.
6. Registrar un pinger en cron-job.org contra `/api/ping` **cada 10 minutos**.

> ⚠️ **Ojo con las dos URLs de Render.** La *Internal* solo funciona dentro de Render (es la que va en la variable del servicio). La *External* es la única que sirve desde su computadora, para `psql` o DBeaver. Confundirlas es el error más común.

> ⚠️ **El servicio gratuito se duerme a los 15 minutos** y tarda 30–60 s en despertar. Antes de la demostración: abrir la app 3 minutos antes y dejarla abierta.

### Recuperación ante pérdida de datos

La base gratuita de Render **expira a los 30 días** y no tiene respaldos. Decisión asumida: la base es reproducible por script. Si se pierde, se recrea completa con un solo comando:

```bash
npm run db:setup
```

Respaldo manual antes de la defensa (requiere PostgreSQL instalado):
`pg_dump "<EXTERNAL_URL>" > backup_predemo.sql`

---

## 4. Credenciales de prueba

Contraseña de todos: **`demo1234`**

| Correo | Nombre | Rol | Para qué sirve en la demo |
|---|---|---|---|
| `ana@sprintcuc.cr` | Ana Rodríguez | **Product Owner** | Ordena el backlog, define el Product Goal, acepta en el Review |
| `marco@sprintcuc.cr` | Marco Jiménez | **Scrum Master** | Abre y cierra Sprints, gestiona impedimentos. **No puede mover tarjetas** |
| `jose@sprintcuc.cr` | José Hernández | **Developer** | Estima, arma el Sprint Backlog, mueve el tablero, marca el DoD |
| `lucia@sprintcuc.cr` | Lucía Vargas | **Developer** | Igual que el anterior |

**Estado inicial de los datos:**

- **Sprint 1** — cerrado. 26 puntos comprometidos, 21 completados. Con Incremento `v0.1.0`, Review (4 historias aceptadas, 1 devuelta) y Retrospectiva con 2 acciones y responsable. Es lo que da sentido al Velocity.
- **Sprint 2** — activo. 34 puntos comprometidos, 6 historias, 10 tareas, 6 Dailies, 2 impedimentos.
- **Historia 8** — tiene **3 de 5 criterios de DoD** marcados a propósito: al intentar cerrarla, el sistema responde 422. Es el momento estelar de la demostración.

---

## 5. Modelo de permisos — criterio 1 de la rúbrica

La regla crítica de la rúbrica dice que no se evalúa como Scrum correcto una solución que trate al Scrum Master como jefe asignador de tareas o al Product Owner como administrador operativo. **Está codificado en la API, no solo en la interfaz.**

| Acción | PO | SM | DEV |
|---|:--:|:--:|:--:|
| Definir Product Goal y visión | ✅ | ❌ | ❌ |
| Crear, editar y eliminar historias | ✅ | ❌ | ❌ |
| **Ordenar / priorizar el Product Backlog** | ✅ | ❌ | ❌ |
| **Estimar en Story Points** | ❌ | ❌ | ✅ |
| Abrir y cerrar el Sprint (facilitación) | ❌ | ✅ | ❌ |
| Definir el Sprint Goal | ✅ | ✅ | ✅ ← todo el Scrum Team |
| **Seleccionar qué entra al Sprint Backlog** | ❌ | ❌ | ✅ |
| **Crear tareas y auto-asignarse** | ❌ | ❌ | ✅ |
| **Mover tarjetas en el tablero** | ❌ | ❌ | ✅ |
| Marcar el checklist de DoD | ❌ | ❌ | ✅ |
| Definir el DoD | ✅ | ✅ | ✅ ← todo el Scrum Team |
| Aceptar / rechazar en el Review | ✅ | ❌ | ❌ |
| Gestionar y escalar impedimentos | ❌ | ✅ | ❌ |
| Reportar un impedimento | ✅ | ✅ | ✅ |

El rol **no viaja en el token**: se resuelve contra la base para el producto concreto de cada petición (`middleware/auth.js`). Una persona puede ser PO en un producto y Developer en otro.

Cuando la API deniega, no devuelve un error técnico sino la razón en términos de Scrum:

```json
{
  "error": "Acción reservada para: Developers",
  "tu_rol": "Scrum Master",
  "detalle": "El Scrum Master facilita, no gestiona el Sprint Backlog ni asigna trabajo. Los Developers son quienes se organizan."
}
```

---

## 6. Reglas de negocio que la rúbrica evalúa

**El DoD bloquea el cierre (criterio 6).** `PUT /api/backlog/:id/done` consulta los criterios sin marcar y devuelve **422** con la lista de faltantes. No existe forma de cerrar una historia saltándose la validación.

**Indicadores con datos reales (criterio 8).** La tabla `status_history` registra cada cambio de estado con su fecha. El Burndown se **reconstruye** desde ahí, sin necesidad de fotos diarias — por eso funciona en un reto de 24 h. Lo mismo alimenta el Cycle Time.

**Capacidad del equipo (criterio 3).** `GET /api/sprints/:id/capacity` suma las horas de los Developers y las compara con lo comprometido.

**Cierre del Sprint (criterios 3 y 7).** No se puede cerrar sin Review y Retrospective registrados; las historias no terminadas **regresan al Product Backlog**, como manda Scrum.

**Autonomía de los Developers.** No se puede comprometer una historia sin Story Points, y las tareas se auto-asignan: `PUT /api/tasks/:id/assign` sin cuerpo asigna al usuario autenticado.

---

## 7. API

Todas las rutas bajo `/api`. `[PO]`, `[SM]`, `[DEV]` indican el rol exigido; sin marca, cualquier miembro del equipo.

| Método | Ruta | Rol | HU |
|---|---|:--:|---|
| GET | `/ping` | — | health check |
| POST | `/auth/register` · `/auth/login` · `/auth/logout` | — | 001, 002 |
| GET/PUT | `/auth/me` | — | 004, 006 |
| GET/POST | `/products` | — | 013, 015 |
| GET | `/products/:id` · `/products/:id/team` | — | 010 |
| PUT | `/products/:id/goal` | PO | 015 |
| POST | `/products/:id/members` | PO SM | 008, 009 |
| PUT | `/products/:id/capacity` | — | 011 |
| GET | `/backlog?product=&estado=&epica=&q=` | — | 019, 025, 026 |
| POST/PUT/DELETE | `/backlog` · `/backlog/:id` | PO | 019, 020, 021 |
| PUT | `/backlog/orden/reorder` | **PO** | 022 |
| PUT | `/backlog/:id/points` | **DEV** | 043, 048 |
| PUT | `/backlog/:id/start` · `/backlog/:id/done` | **DEV** | 086 |
| GET/POST | `/sprints` | SM crea | 049, 050, 053 |
| GET | `/sprints/:id` · `/sprints/:id/capacity` | — | 057 |
| PUT | `/sprints/:id/goal` | PO SM DEV | 052 |
| POST/DELETE | `/sprints/:id/items` | **DEV** | 058, 061 |
| PUT | `/sprints/:id/activate` · `/close` | SM | 054 |
| GET | `/tasks?sprint=` | — | 068, 070 |
| POST | `/tasks` | DEV | 062 |
| PUT | `/tasks/:id/status` · `/assign` · `/block` | **DEV** | 063, 069, 072 |
| GET/POST | `/dailies?sprint=` | — | 074, 075, 076, 077 |
| GET/POST | `/impediments?sprint=` | — | 078 |
| PUT | `/impediments/:id` | **SM** | 079, 080, 081, 083 |
| GET/POST/DELETE | `/dod` | equipo | 084 |
| GET | `/dod/item/:itemId` | — | 085 |
| PUT | `/dod/check` | DEV | 085 |
| GET/POST | `/increment?sprint=` | DEV crea | 093, 094 |
| GET/POST | `/review?sprint=` | SM crea | 097, 102 |
| PUT | `/review/:id/item` | **PO** | 099 |
| POST | `/review/:id/feedback` | — | 100 |
| POST | `/review/feedback/:id/to-backlog` | **PO** | 101 |
| GET/POST | `/retro?sprint=` · `/retro/:id/notes` | SM crea | 103–106 |
| PUT | `/retro/notes/:id` · `/vote` | — | 107, 109 |
| GET | `/retro/acciones?product=` | — | 110 |
| GET | `/metrics/burndown?sprint=` | — | 112 |
| GET | `/metrics/velocity?product=` | — | 111, 117 |
| GET | `/metrics/cumplimiento?sprint=` | — | 116 |
| GET | `/metrics/cycletime?sprint=` | — | 114 |
| GET | `/metrics/dashboard?product=` | — | 120 |

---

## 8. Pruebas

63 pruebas de extremo a extremo que recorren el flujo completo del Sprint y **verifican que cada rol solo puede hacer lo que Scrum le permite**.

```bash
npm run dev                    # en una terminal
npm test                       # en otra
# o contra el despliegue:
BASE_URL=https://<app>.onrender.com npm test
```

Cubren: autenticación, los tres roles contra cada acción restringida, bloqueo del DoD con 422, capacidad del equipo, comprometer historias sin estimar, creación de impedimentos desde el Daily, aceptación del PO en el Review, acciones de retro sin responsable, burndown, velocity, cycle time, dashboard y cierre del Sprint.

> Ejecutar las pruebas **reescribe los datos de prueba**. Volver a cargar `seed.sql` antes de la demostración.

---

## 9. Modelo de datos

19 tablas. Las que sostienen la evaluación:

- `products.product_goal` — obligatorio a nivel de esquema (`NOT NULL`).
- `team_members.rol` — `CHECK (rol IN ('PO','SM','DEV'))`, con `capacidad_horas` para el Planning.
- `backlog_items.prioridad_orden` — el orden del PO, persistente.
- `sprint_items.puntos_comprometidos` — congela lo comprometido aunque la estimación cambie después.
- `item_dod_checks` — el checklist por historia; sin él no hay cierre.
- `increments`, `reviews`, `review_items`, `review_feedback`, `retros`, `retro_notes` — la evidencia de los eventos.
- **`status_history`** — cada cambio de estado con fecha, autor y puntos. Base del Burndown, del Cycle Time y de la auditoría.

Diagrama de trazabilidad, tal como lo exige el criterio 1:

```
Product Goal → Product Backlog → Sprint Goal → Sprint Backlog
   → Tareas → Incremento → Review → Retrospective → (backlog del siguiente Sprint)
```

---

## 10. Deuda técnica asumida

Decisiones conscientes, tomadas por el límite de 24 horas y documentadas para la defensa:

- **Sin realtime.** El tablero se actualiza por consulta cada 8 segundos en lugar de WebSockets. Suficiente para un equipo pequeño y elimina la infraestructura de sockets.
- **Sin adjuntos.** El disco de Render es efímero (ver §2).
- **Sin notificaciones ni calendario.** Épicas 22 y 23 completas fuera de alcance: no aparecen en ningún criterio de la rúbrica.
- **Planning Poker no implementado.** HU-044 a 047 quedaron como valor agregado; la estimación se registra directa.
- **Sin paginación** en el backlog. Con volúmenes de un proyecto real habría que agregarla.
- **Base de datos sin respaldos automáticos.** Mitigado con reproducibilidad por script (ver §3).

## 11. Fuera de alcance

De las 150 historias del backlog maestro se implementaron **74**: 60 completas (API + interfaz) y 14 solo en la API. Las 76 restantes se descartaron con un criterio único: *¿sin esta historia se puede ejecutar y evidenciar un Sprint completo?* Si la respuesta era sí, quedó fuera del Sprint 1.

**El detalle historia por historia está en [`BACKLOG-IMPLEMENTADO.md`](BACKLOG-IMPLEMENTADO.md)**, con el estado de cada una y dónde se demuestra.

Épicas completas fuera de alcance: 6 (refinamiento), 15 (calidad y pruebas), 21 (colaboración), 22 (notificaciones), 23 (calendario), 24 (releases) y 25 (administración y seguridad avanzada).
