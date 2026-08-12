import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* ============================================================
   HU-112: Burndown Chart.
   Calculado desde status_history, no desde fotos diarias.
   Esto es lo que permite tener una curva real en un reto de 24 h:
   cada cambio de estado quedo registrado con su fecha, asi que el
   trabajo restante se reconstruye para cualquier dia del Sprint.
   La rubrica exige indicadores "calculados con datos reales".
   ============================================================ */
r.get('/burndown', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);

    const { rows: s } = await q(
      'SELECT numero, sprint_goal, fecha_inicio, fecha_fin, estado FROM sprints WHERE id = $1',
      [sprintId]
    );
    if (!s[0]) return res.status(404).json({ error: 'Sprint no encontrado' });

    const { rows: c } = await q(
      'SELECT COALESCE(SUM(puntos_comprometidos),0)::int AS total FROM sprint_items WHERE sprint_id = $1',
      [sprintId]
    );
    const total = c[0].total;

    const { rows: serie } = await q(
      `WITH s AS (SELECT fecha_inicio, fecha_fin FROM sprints WHERE id = $1),
            dias AS (
              SELECT generate_series((SELECT fecha_inicio FROM s),
                                     (SELECT fecha_fin FROM s),
                                     INTERVAL '1 day')::date AS dia
            ),
            cierres AS (
              SELECT creado_en::date AS dia, SUM(story_points)::int AS pts
                FROM status_history
               WHERE sprint_id = $1 AND entidad = 'item' AND estado_nuevo = 'done'
               GROUP BY 1
            )
       SELECT d.dia,
              COALESCE(c.pts,0)::int AS cerrados_dia,
              SUM(COALESCE(c.pts,0)) OVER (ORDER BY d.dia)::int AS acumulado
         FROM dias d LEFT JOIN cierres c ON c.dia = d.dia
        ORDER BY d.dia`,
      [sprintId]
    );

    const hoy = new Date().toISOString().slice(0, 10);
    const n = serie.length;

    const puntos = serie.map((fila, i) => {
      const dia = fila.dia.toISOString().slice(0, 10);
      return {
        dia,
        ideal: Number((total - (total / Math.max(n - 1, 1)) * i).toFixed(1)),
        // Solo hasta hoy: el futuro no se dibuja
        restante: dia <= hoy ? total - fila.acumulado : null,
        cerrados_dia: fila.cerrados_dia
      };
    });

    const ultimo = puntos.filter((p) => p.restante !== null).at(-1);

    res.json({
      sprint: s[0],
      total_comprometido: total,
      restante_hoy: ultimo?.restante ?? total,
      completado_hoy: total - (ultimo?.restante ?? total),
      puntos
    });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   HU-111 / HU-117: Velocity Chart y velocidad promedio.
   Necesita al menos dos Sprints cerrados para decir algo util:
   por eso los datos de prueba traen el Sprint 1 ya cerrado.
   ============================================================ */
r.get('/velocity', requireMember('product'), async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT s.numero, s.sprint_goal, s.fecha_inicio, s.fecha_fin,
              COALESCE(SUM(si.puntos_comprometidos),0)::int AS comprometidos,
              COALESCE(SUM(CASE WHEN b.estado = 'done' THEN b.story_points END),0)::int AS completados
         FROM sprints s
         LEFT JOIN sprint_items si ON si.sprint_id = s.id
         LEFT JOIN backlog_items b ON b.id = si.item_id
        WHERE s.product_id = $1 AND s.estado = 'cerrado'
        GROUP BY s.id, s.numero, s.sprint_goal, s.fecha_inicio, s.fecha_fin
        ORDER BY s.numero`,
      [req.productId]
    );

    const promedio = rows.length
      ? Number((rows.reduce((a, s) => a + s.completados, 0) / rows.length).toFixed(1))
      : 0;

    res.json({
      sprints: rows,
      velocidad_promedio: promedio,
      // HU-060: con que numero comparar al planificar el proximo Sprint
      recomendacion: rows.length
        ? `Con base en ${rows.length} Sprint(s) cerrado(s), comprometer alrededor de ${Math.round(promedio)} Story Points.`
        : 'Aun no hay Sprints cerrados para calcular la velocidad historica.'
    });
  } catch (err) {
    next(err);
  }
});

/* HU-116: porcentaje de cumplimiento del Sprint */
r.get('/cumplimiento', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { rows } = await q(
      `SELECT COUNT(*)::int AS historias,
              COUNT(*) FILTER (WHERE b.estado = 'done')::int AS terminadas,
              COALESCE(SUM(si.puntos_comprometidos),0)::int AS puntos,
              COALESCE(SUM(CASE WHEN b.estado='done' THEN b.story_points END),0)::int AS puntos_hechos
         FROM sprint_items si JOIN backlog_items b ON b.id = si.item_id
        WHERE si.sprint_id = $1`,
      [sprintId]
    );
    const d = rows[0];
    res.json({
      ...d,
      porcentaje_historias: d.historias ? Math.round((d.terminadas / d.historias) * 100) : 0,
      porcentaje_puntos: d.puntos ? Math.round((d.puntos_hechos / d.puntos) * 100) : 0
    });
  } catch (err) {
    next(err);
  }
});

/* HU-114: Cycle Time, del historial de tareas */
r.get('/cycletime', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { rows } = await q(
      `WITH mov AS (
         SELECT entidad_id,
                MIN(creado_en) FILTER (WHERE estado_nuevo = 'progreso')  AS inicio,
                MAX(creado_en) FILTER (WHERE estado_nuevo = 'terminado') AS fin
           FROM status_history
          WHERE sprint_id = $1 AND entidad = 'task'
          GROUP BY entidad_id
       )
       SELECT t.id, t.titulo,
              ROUND(EXTRACT(EPOCH FROM (m.fin - m.inicio)) / 3600, 1) AS horas
         FROM mov m JOIN tasks t ON t.id = m.entidad_id
        WHERE m.inicio IS NOT NULL AND m.fin IS NOT NULL
        ORDER BY horas DESC`,
      [sprintId]
    );
    const promedio = rows.length
      ? Number((rows.reduce((a, t) => a + Number(t.horas), 0) / rows.length).toFixed(1))
      : 0;
    res.json({ tareas: rows, cycle_time_promedio_horas: promedio });
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   HU-120: Dashboard del proyecto.
   Una sola llamada con todo lo que la rubrica pide ver:
   Sprint actual, meta, dias restantes, puntos, bloqueos,
   impedimentos y velocidad.
   ============================================================ */
r.get('/dashboard', requireMember('product'), async (req, res, next) => {
  try {
    const { rows: p } = await q(
      'SELECT id, nombre, product_goal FROM products WHERE id = $1', [req.productId]
    );

    const { rows: s } = await q(
      `SELECT * FROM sprints
        WHERE product_id = $1 AND estado = 'activo'
        ORDER BY numero DESC LIMIT 1`,
      [req.productId]
    );

    const { rows: backlog } = await q(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE estado = 'backlog')::int AS pendientes,
              COALESCE(SUM(story_points) FILTER (WHERE estado <> 'done'),0)::int AS puntos_pendientes,
              COUNT(*) FILTER (WHERE story_points IS NULL)::int AS sin_estimar
         FROM backlog_items WHERE product_id = $1`,
      [req.productId]
    );

    if (!s[0]) {
      return res.json({
        producto: p[0], sprint_actual: null, backlog: backlog[0],
        mensaje: 'No hay ningun Sprint activo en este momento.'
      });
    }

    const sprintId = s[0].id;

    const [{ rows: pts }, { rows: tareas }, { rows: imp }, { rows: dailies }] = await Promise.all([
      q(`SELECT COALESCE(SUM(si.puntos_comprometidos),0)::int AS comprometidos,
                COALESCE(SUM(CASE WHEN b.estado='done' THEN b.story_points END),0)::int AS completados,
                COUNT(*)::int AS historias,
                COUNT(*) FILTER (WHERE b.estado='done')::int AS historias_done
           FROM sprint_items si JOIN backlog_items b ON b.id = si.item_id
          WHERE si.sprint_id = $1`, [sprintId]),
      q(`SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE t.estado = 'terminado')::int AS terminadas,
                COUNT(*) FILTER (WHERE t.bloqueada)::int AS bloqueadas
           FROM tasks t JOIN sprint_items si ON si.item_id = t.item_id
          WHERE si.sprint_id = $1`, [sprintId]),
      q(`SELECT COUNT(*) FILTER (WHERE estado <> 'resuelto')::int AS abiertos,
                COUNT(*)::int AS total
           FROM impediments WHERE sprint_id = $1`, [sprintId]),
      q(`SELECT COUNT(*)::int AS hoy FROM dailies
          WHERE sprint_id = $1 AND fecha = CURRENT_DATE`, [sprintId])
    ]);

    const { rows: vel } = await q(
      `SELECT ROUND(AVG(c.completados),1) AS promedio FROM (
         SELECT COALESCE(SUM(CASE WHEN b.estado='done' THEN b.story_points END),0) AS completados
           FROM sprints s
           LEFT JOIN sprint_items si ON si.sprint_id = s.id
           LEFT JOIN backlog_items b ON b.id = si.item_id
          WHERE s.product_id = $1 AND s.estado = 'cerrado'
          GROUP BY s.id) c`,
      [req.productId]
    );

    const diasRestantes = Math.max(
      0, Math.ceil((new Date(s[0].fecha_fin) - new Date()) / 86_400_000)
    );

    res.json({
      producto: p[0],
      mi_rol: req.rol,
      sprint_actual: {
        ...s[0],
        dias_restantes: diasRestantes,
        ...pts[0],
        porcentaje: pts[0].comprometidos
          ? Math.round((pts[0].completados / pts[0].comprometidos) * 100) : 0
      },
      tareas: tareas[0],
      impedimentos: imp[0],
      dailies_hoy: dailies[0].hoy,
      backlog: backlog[0],
      velocidad_promedio: Number(vel[0]?.promedio ?? 0)
    });
  } catch (err) {
    next(err);
  }
});

export default r;
