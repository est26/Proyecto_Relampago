import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* ------------------------------------------------------------
   HU-093 / HU-094: el Incremento.
   El criterio 1 de la rubrica exige trazabilidad entre
   Product Goal, Product Backlog, Sprint Goal, Sprint Backlog,
   INCREMENTO, Review y Retrospective. Sin este artefacto visible
   la cadena queda rota.
   ------------------------------------------------------------ */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);

    const { rows: s } = await q(
      'SELECT numero, sprint_goal, fecha_inicio, fecha_fin, estado FROM sprints WHERE id = $1',
      [sprintId]
    );
    if (!s[0]) return res.status(404).json({ error: 'Sprint no encontrado' });

    const { rows: inc } = await q('SELECT * FROM increments WHERE sprint_id = $1', [sprintId]);

    // HU-094: historias que forman el incremento
    const { rows: historias } = await q(
      `SELECT b.id, b.codigo, b.titulo, b.story_points, b.criterios_aceptacion
         FROM sprint_items si JOIN backlog_items b ON b.id = si.item_id
        WHERE si.sprint_id = $1 AND b.estado = 'done'
        ORDER BY b.prioridad_orden`,
      [sprintId]
    );

    const { rows: fuera } = await q(
      `SELECT b.id, b.codigo, b.titulo, b.story_points, b.estado
         FROM sprint_items si JOIN backlog_items b ON b.id = si.item_id
        WHERE si.sprint_id = $1 AND b.estado <> 'done'
        ORDER BY b.prioridad_orden`,
      [sprintId]
    );

    res.json({
      sprint: s[0],
      incremento: inc[0] ?? null,
      historias,
      no_terminadas: fuera,
      puntos_entregados: historias.reduce((a, h) => a + (h.story_points || 0), 0),
      puntos_no_entregados: fuera.reduce((a, h) => a + (h.story_points || 0), 0)
    });
  } catch (err) {
    next(err);
  }
});

/* Registrar o actualizar el incremento. Lo documentan los Developers. */
r.post('/', requireRole(['DEV'], 'sprint'), async (req, res, next) => {
  try {
    const { sprint_id, descripcion, version } = req.body;
    if (!sprint_id) return res.status(400).json({ error: 'sprint_id es obligatorio' });

    const { rows } = await q(
      `INSERT INTO increments (sprint_id, descripcion, version)
       VALUES ($1,$2,$3)
       ON CONFLICT (sprint_id) DO UPDATE
         SET descripcion = EXCLUDED.descripcion, version = EXCLUDED.version
       RETURNING *`,
      [sprint_id, descripcion ?? null, version ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default r;
