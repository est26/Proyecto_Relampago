# Estado del proyecto — SprintCUC

**Fecha:** 11 de agosto de 2026 · **Equipo:** 3 personas · **Reto:** 24 horas

---

## Resumen

La aplicación está **construida y verificada**: base de datos, API y PWA móvil completas, con 93 comprobaciones automáticas pasando contra un PostgreSQL real.

Lo que falta no es código: es **desplegar, repartir los commits, grabar el video y ensayar la demostración**.

```
Construido y probado   ████████████████████░  ~85 %
Pendiente (de ustedes) ████░░░░░░░░░░░░░░░░░  ~15 %
```

---

## Lo que está listo

| Componente | Estado | Detalle |
|---|---|---|
| **Base de datos** | ✅ | 19 tablas, `schema.sql` + `seed.sql` reproducibles |
| **API** | ✅ | 12 routers, ~50 endpoints, permisos por rol en el servidor |
| **PWA móvil** | ✅ | 12 pantallas, instalable, arrastre y gráficas |
| **Datos de prueba** | ✅ | Sprint 1 cerrado + Sprint 2 activo, coherentes |
| **Pruebas** | ✅ | 63 de API + 30 de interfaz = **93, todas pasando** |
| **Documentación** | ✅ | README con arquitectura, permisos, endpoints y deuda técnica |
| **Config. de Render** | ✅ | `render.yaml` con base enlazada y health check |
| **Arranque local** | ✅ | `npm run db:setup` carga la base sin necesidad de instalar `psql` |

**Cifras:** 48 archivos · ~5.600 líneas · **74 de las 150 historias implementadas** (60 completas con interfaz + 14 solo en la API). Detalle en `BACKLOG-IMPLEMENTADO.md`.

> ⚠️ **Cuatro huecos que sí afectan la nota:** crear producto (HU-013/015), asignar responsabilidades (HU-008/009) y editar/eliminar historias (HU-020/021) funcionan en la API pero **no tienen pantalla**. Los dos primeros están en el alcance mínimo obligatorio y el tercero lo exige el descriptor *Excelente* del criterio 2. Son tres pantallas pequeñas.

> **Planning Poker (HU-044 a 047): descartado por decisión del equipo.** Queda documentado como fuera de alcance. No aparece en ningún criterio de la rúbrica.

### Verificación ejecutada

```
63 pruebas de API contra PostgreSQL 18 real ......... OK
30 comprobaciones de interfaz en un DOM real ........ OK
Build de producción (853 módulos, 197 kB gzip) ...... OK
Express sirve el SPA + API sin conflicto ............ OK
```

---

## Cobertura de la rúbrica

| # | Criterio | Pts | Estado |
|---|---|:--:|---|
| 1 | Aplicación correcta de Scrum | 15 | ✅ `requireRole()` en el servidor; matriz de responsabilidades en la app |
| 2 | Product Backlog e historias | 12 | ✅ CRUD, arrastre para priorizar, criterios, Story Points |
| 3 | Planificación del Sprint | 12 | ✅ Sprint Goal, capacidad del equipo, Sprint Backlog por Developers |
| 4 | Tablero y flujo de trabajo | 10 | ✅ 5 columnas, arrastre, actualización cada 8 s |
| 5 | Daily e impedimentos | 8 | ✅ Tres preguntas, impedimento automático, antigüedad y responsable |
| 6 | DoD y calidad del incremento | 8 | ✅ Checklist que **bloquea el cierre** con 422 |
| 7 | Review y Retrospective | 8 | ✅ Aceptación del PO, feedback → backlog, acciones con responsable |
| 8 | Indicadores | 7 | ✅ Burndown, Velocity, cumplimiento y Cycle Time desde `status_history` |
| 9 | Arquitectura y calidad técnica | 8 | ✅ Modelo coherente, transacciones, manejo de errores, 93 pruebas |
| 10 | UX/UI móvil | 5 | ✅ Mobile-first, PWA instalable · ⚠️ falta probar en un celular real |
| 11 | Control de versiones | 3 | ⛔ **Pendiente: es trabajo de ustedes** |
| 12 | Demostración y defensa | 4 | ⛔ **Pendiente: ensayo y video** |

**Construido: 85 de 100 puntos.** Los 15 restantes dependen de ejecución, no de programación.

---

## Lo que falta, en orden

### 🔴 Crítico — hacer ya

**1. Desplegar en Render (≈30 min).** Es el riesgo mayor del reto.

```
Render → New → PostgreSQL   (plan Free, anotar la región)
   copiar la EXTERNAL Database URL al archivo .env
npm run db:setup            (carga esquema y datos de prueba)
Render → New → Web Service  (misma región, runtime Node)
   Build: npm install && npm run build
   Start: npm start
   Variables: DATABASE_URL (la Internal), JWT_SECRET, NODE_ENV=production
Abrir https://<app>.onrender.com/api/ping  →  {"ok":true,"db":1}
```

**2. Registrar el pinger** en cron-job.org contra `/api/ping` **cada 10 minutos**. Sin esto, el servicio se duerme a los 15 minutos y tarda 30–60 s en despertar. Si el evaluador ve pantalla en blanco un minuto, aplica la penalización de "aplicación no ejecutable" y **topa 73 puntos**.

**3. Repartir los commits (criterio 11, 3 pts).** El repositorio necesita evidencia de los tres a lo largo de las 24 horas, no un solo push masivo. Sugerencia de reparto por módulos:

| | Archivos | Criterios que defiende |
|---|---|---|
| **Dev A** | `middleware/auth.js`, `routes/auth.js`, `products.js`, `backlog.js`, `pages/Backlog.jsx`, `Historia.jsx`, `Equipo.jsx` | 1 y 2 (27 pts) |
| **Dev B** | `routes/sprints.js`, `tasks.js`, `dailies.js`, `impediments.js`, `pages/Sprint.jsx`, `Planning.jsx`, `Tablero.jsx`, `Daily.jsx`, `Impedimentos.jsx` | 3, 4 y 5 (30 pts) |
| **Dev C** | `routes/dod.js`, `increment.js`, `review.js`, `retro.js`, `metrics.js`, `pages/Cierre.jsx`, `Metricas.jsx`, `Dashboard.jsx`, despliegue | 6, 7 y 8 (23 pts) |

Cada quien debe **entender y poder explicar** sus archivos: la rúbrica penaliza la incapacidad de explicar el código entregado.

### 🟡 Importante — antes de la entrega

**4. Probar desde un celular real** con datos móviles, e instalar la PWA ("Agregar a pantalla de inicio"). Enseñarla instalada en la demostración vale para el criterio 10.

**5. Recargar `seed.sql`** después de cualquier prueba. `npm test` reescribe los datos.

**6. Grabar el video** explicativo y subirlo a la carpeta correspondiente.

**7. Ensayar la demostración cronometrada** (8 min) y repartir la defensa (5 min) entre los tres. "Explicación dependiente de un solo integrante" baja el criterio 12.

### 🟢 Opcional — solo con todo lo anterior listo

- **Planning Poker** con votación oculta (HU-044/045/046, ~1 h). Es el "wow" de la demostración.
- Burnup y gráfica de Cycle Time (el endpoint ya existe, falta la pantalla).
- Gestionar el propio reto dentro de la app: da datos reales y permite decir en la defensa *"la app que ven gestionó su propio desarrollo"*.

---

## Guion de la demostración (8 minutos)

| Tiempo | Qué mostrar | Con qué usuario |
|---|---|---|
| 0:00–0:45 | Problema, Product Goal y **qué decidimos NO construir** (97 historias descartadas) | — |
| 0:45–2:00 | Backlog priorizado **arrastrando**, historia con criterios de aceptación | Ana (PO) |
| 2:00–3:30 | Planning: capacidad 60 h, seleccionar historias, Sprint Backlog armado | José (DEV) |
| 3:30–5:00 | Tablero: asumir tarea, mover tarjeta, Daily con impedimento | José (DEV) |
| 5:00–6:15 | **Historia 8: el DoD bloquea el cierre.** Mostrar el error, marcar lo que falta, cerrar | José (DEV) |
| 6:15–7:15 | Incremento, PO acepta en el Review, feedback → historia nueva, Retro con responsable | Ana (PO) |
| 7:15–7:45 | Burndown y Velocity generados de esos mismos datos | cualquiera |
| 7:45–8:00 | **Entrar como Marco (SM) e intentar mover una tarjeta → aviso de Scrum** | Marco (SM) |

Ese último gesto de 15 segundos es lo que más pesa en el criterio 1, que vale 15 puntos.

**Preparación:** abrir la app 3 minutos antes y dejarla abierta. Tener las 4 sesiones listas en pestañas distintas.

---

## Riesgos abiertos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Render duerme el servicio | **Topa 73 pts** | Pinger cada 10 min + abrir 3 min antes + considerar el plan Starter (~US$7) |
| Commits concentrados al final | 0 en criterio 11 | Repartir hoy mismo por módulos |
| La demo la lleva una sola persona | Baja el criterio 12 | Ensayar con los tres hablando |
| La base gratuita expira en 30 días | Nulo para la entrega | Documentado; se recrea con los dos scripts |
| Datos alterados por `npm test` | Demo confusa | Recargar `seed.sql` antes de grabar y de presentar |
