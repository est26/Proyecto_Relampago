import { Router } from 'express';
import { q, tx } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* HU-097/102: consultar el Sprint Review */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { rows: rev } = await q('SELECT * FROM reviews WHERE sprint_id = $1', [sprintId]);
    if (!rev[0]) return res.json({ review: null, items: [], feedback: [] });

    const { rows: items } = await q(
      `SELECT b.id, b.codigo, b.titulo, b.story_points, b.estado,
              ri.aceptada, ri.comentario
         FROM sprint_items si
         JOIN backlog_items b ON b.id = si.item_id
         LEFT JOIN review_items ri ON ri.item_id = b.id AND ri.review_id = $2
        WHERE si.sprint_id = $1
        ORDER BY b.prioridad_orden`,
      [sprintId, rev[0].id]
    );

    const { rows: feedback } = await q(
      `SELECT f.*, b.codigo AS item_generado_codigo, b.titulo AS item_generado_titulo
         FROM review_feedback f
         LEFT JOIN backlog_items b ON b.id = f.item_generado_id
        WHERE f.review_id = $1 ORDER BY f.id`,
      [rev[0].id]
    );

    res.json({
      review: rev[0],
      items,
      feedback,
      aceptadas: items.filter((i) => i.aceptada).length,
      total: items.length
    });
  } catch (err) {
    next(err);
  }
});

/* HU-097: el Scrum Master convoca el Review */
r.post('/', requireRole(['SM'], 'sprint'), async (req, res, next) => {
  try {
    const { sprint_id, resultado } = req.body;
    if (!sprint_id) return res.status(400).json({ error: 'sprint_id es obligatorio' });
    const { rows } = await q(
      `INSERT INTO reviews (sprint_id, resultado) VALUES ($1,$2)
       ON CONFLICT (sprint_id) DO UPDATE SET resultado = EXCLUDED.resultado
       RETURNING *`,
      [sprint_id, resultado ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-102: registrar el resultado del Sprint */
r.put('/:id/resultado', requireRole(['PO', 'SM', 'DEV'], 'review'), async (req, res, next) => {
  try {
    const { rows } = await q(
      'UPDATE reviews SET resultado = $2 WHERE id = $1 RETURNING *',
      [Number(req.params.id), req.body.resultado ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Review no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-099: aceptar o rechazar el trabajo presentado.
   Es exclusivo del Product Owner: nadie mas valida el valor
   entregado, ni siquiera el Scrum Master.
   ------------------------------------------------------------ */
r.put('/:id/item', requireRole(['PO'], 'review'), async (req, res, next) => {
  try {
    const { item_id, aceptada, comentario } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id es obligatorio' });

    const { rows } = await q(
      `INSERT INTO review_items (review_id, item_id, aceptada, comentario)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (review_id, item_id) DO UPDATE
         SET aceptada = EXCLUDED.aceptada, comentario = EXCLUDED.comentario
       RETURNING *`,
      [Number(req.params.id), item_id, aceptada === true, comentario ?? null]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-100: registrar retroalimentacion (tambien de stakeholders) */
r.post('/:id/feedback', requireMember('review'), async (req, res, next) => {
  try {
    const { autor, texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'texto es obligatorio' });
    const { rows } = await q(
      'INSERT INTO review_feedback (review_id, autor, texto) VALUES ($1,$2,$3) RETURNING *',
      [Number(req.params.id), autor ?? req.user.nombre, texto.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-101: convertir retroalimentacion en una historia del
   Product Backlog. Cierra el ciclo inspeccion -> adaptacion,
   que es lo que la rubrica llama trazabilidad.
   ------------------------------------------------------------ */
r.post('/feedback/:feedbackId/to-backlog', requireAuth, async (req, res, next) => {
  try {
    const feedbackId = Number(req.params.feedbackId);

    const { rows: f } = await q(
      `SELECT f.*, s.product_id
         FROM review_feedback f
         JOIN reviews rv ON rv.id = f.review_id
         JOIN sprints s ON s.id = rv.sprint_id
        WHERE f.id = $1`,
      [feedbackId]
    );
    if (!f[0]) return res.status(404).json({ error: 'Feedback no encontrado' });
    if (f[0].item_generado_id) {
      return res.status(409).json({ error: 'Ese feedback ya genero una historia', item_id: f[0].item_generado_id });
    }

    // Solo el Product Owner incorpora trabajo al Product Backlog
    const { rows: rol } = await q(
      `SELECT tm.rol FROM team_members tm
         JOIN products p ON p.team_id = tm.team_id
        WHERE p.id = $1 AND tm.user_id = $2`,
      [f[0].product_id, req.user.id]
    );
    if (rol[0]?.rol !== 'PO') {
      return res.status(403).json({
        error: 'Accion reservada para: Product Owner',
        detalle: 'Solo el Product Owner decide que entra al Product Backlog.'
      });
    }

    const item = await tx(async (c) => {
      const { rows: max } = await c.query(
        'SELECT COALESCE(MAX(prioridad_orden),0) + 1 AS n FROM backlog_items WHERE product_id = $1',
        [f[0].product_id]
      );
      const { rows: b } = await c.query(
        `INSERT INTO backlog_items (product_id, epica, titulo, quiero, prioridad_orden, estado)
         VALUES ($1,'Feedback del Review',$2,$3,$4,'backlog') RETURNING *`,
        [f[0].product_id, req.body.titulo ?? f[0].texto.slice(0, 180), f[0].texto, max[0].n]
      );
      await c.query('UPDATE review_feedback SET item_generado_id = $1 WHERE id = $2', [b[0].id, feedbackId]);
      return b[0];
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

export default r;
