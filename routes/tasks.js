import { Router } from 'express';
import { q, logStatus } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

const ESTADOS = ['pendiente', 'progreso', 'revision', 'pruebas', 'terminado'];

async function sprintDeTarea(taskId) {
  const { rows } = await q(
    `SELECT s.id FROM tasks t
       JOIN sprint_items si ON si.item_id = t.item_id
       JOIN sprints s ON s.id = si.sprint_id
      WHERE t.id = $1 AND s.estado <> 'cerrado'
      ORDER BY s.numero DESC LIMIT 1`,
    [taskId]
  );
  return rows[0]?.id ?? null;
}

/* ------------------------------------------------------------
   HU-068: el tablero.
   GET /api/tasks?sprint=2  ->  columnas listas para pintar.
   El frontend lo consulta cada 8 segundos (HU-070).
   ------------------------------------------------------------ */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { asignado, item } = req.query;

    const cond = ['si.sprint_id = $1'];
    const params = [sprintId];
    if (asignado) { params.push(Number(asignado)); cond.push(`t.asignado_a = $${params.length}`); }
    if (item)     { params.push(Number(item));     cond.push(`t.item_id = $${params.length}`); }

    const { rows } = await q(
      `SELECT t.*, u.nombre AS asignado_nombre,
              b.id AS historia_id, b.codigo AS historia_codigo, b.titulo AS historia_titulo,
              b.story_points
         FROM tasks t
         JOIN backlog_items b ON b.id = t.item_id
         JOIN sprint_items si ON si.item_id = b.id
         LEFT JOIN users u ON u.id = t.asignado_a
        WHERE ${cond.join(' AND ')}
        ORDER BY b.prioridad_orden, t.id`,
      params
    );

    const columnas = Object.fromEntries(ESTADOS.map((e) => [e, []]));
    for (const t of rows) columnas[t.estado].push(t);

    res.json({
      columnas,
      total: rows.length,
      bloqueadas: rows.filter((t) => t.bloqueada).length,
      actualizado: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

/* HU-062: descomponer una historia en tareas tecnicas. Solo Developers. */
r.post('/', requireRole(['DEV'], 'item'), async (req, res, next) => {
  try {
    const { item_id, titulo, horas_estimadas, asignado_a } = req.body;
    if (!item_id || !titulo) {
      return res.status(400).json({ error: 'item_id y titulo son obligatorios' });
    }
    const { rows } = await q(
      `INSERT INTO tasks (item_id, titulo, horas_estimadas, asignado_a)
       VALUES ($1,$2,COALESCE($3,0),$4) RETURNING *`,
      [item_id, titulo, horas_estimadas ?? null, asignado_a ?? null]
    );
    await logStatus({
      entidad: 'task', entidadId: rows[0].id, sprintId: await sprintDeTarea(rows[0].id),
      nuevo: 'pendiente', userId: req.user.id
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-069: mover la tarjeta entre estados.
   Solo los Developers. Cada movimiento queda en status_history,
   que es de donde salen el Burndown y el Cycle Time.
   ------------------------------------------------------------ */
r.put('/:id/status', requireRole(['DEV'], 'task'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado invalido', permitidos: ESTADOS });
    }

    const { rows: prev } = await q('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!prev[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (prev[0].estado === estado) return res.json(prev[0]);

    const { rows } = await q('UPDATE tasks SET estado = $2 WHERE id = $1 RETURNING *', [id, estado]);
    await logStatus({
      entidad: 'task', entidadId: id, sprintId: await sprintDeTarea(id),
      anterior: prev[0].estado, nuevo: estado, userId: req.user.id
    });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-063: el Developer ASUME la tarea.
   Por defecto se auto-asigna: en Scrum nadie reparte el trabajo,
   el equipo se organiza solo. Por eso el cuerpo puede venir vacio.
   ------------------------------------------------------------ */
r.put('/:id/assign', requireRole(['DEV'], 'task'), async (req, res, next) => {
  try {
    const destino = req.body.asignado_a ?? req.user.id;
    const { rows } = await q(
      `UPDATE tasks SET asignado_a = $2 WHERE id = $1 RETURNING *`,
      [Number(req.params.id), destino]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-072: marcar o desmarcar bloqueo */
r.put('/:id/block', requireRole(['DEV'], 'task'), async (req, res, next) => {
  try {
    const { rows } = await q(
      'UPDATE tasks SET bloqueada = $2 WHERE id = $1 RETURNING *',
      [Number(req.params.id), req.body.bloqueada !== false]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

r.delete('/:id', requireRole(['DEV'], 'task'), async (req, res, next) => {
  try {
    const { rowCount } = await q('DELETE FROM tasks WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default r;
