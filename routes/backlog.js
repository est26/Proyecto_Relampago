import { Router } from 'express';
import { q, tx, logStatus } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* Sprint activo al que pertenece una historia (si esta comprometida) */
async function sprintDeItem(itemId) {
  const { rows } = await q(
    `SELECT s.id FROM sprint_items si
       JOIN sprints s ON s.id = si.sprint_id
      WHERE si.item_id = $1 AND s.estado <> 'cerrado'
      ORDER BY s.numero DESC LIMIT 1`,
    [itemId]
  );
  return rows[0]?.id ?? null;
}

/* ------------------------------------------------------------
   HU-019 / HU-025 / HU-026: consultar el Product Backlog
   ------------------------------------------------------------ */
r.get('/', requireMember('product'), async (req, res, next) => {
  try {
    const { estado, epica, q: texto, sin_sprint } = req.query;

    const cond = ['b.product_id = $1'];
    const params = [req.productId];

    if (estado) { params.push(estado); cond.push(`b.estado = $${params.length}`); }
    if (epica)  { params.push(epica);  cond.push(`b.epica = $${params.length}`); }
    if (texto)  {
      params.push(`%${texto}%`);
      cond.push(`(b.titulo ILIKE $${params.length} OR b.codigo ILIKE $${params.length}
                  OR b.quiero ILIKE $${params.length})`);
    }
    if (sin_sprint === 'true') {
      cond.push(`NOT EXISTS (SELECT 1 FROM sprint_items si
                               JOIN sprints s ON s.id = si.sprint_id
                              WHERE si.item_id = b.id AND s.estado <> 'cerrado')`);
    }

    const { rows } = await q(
      `SELECT b.*,
              s.id AS sprint_id, s.numero AS sprint_numero,
              (SELECT COUNT(*) FROM tasks t WHERE t.item_id = b.id) AS total_tareas,
              (SELECT COUNT(*) FROM tasks t WHERE t.item_id = b.id AND t.estado = 'terminado') AS tareas_listas
         FROM backlog_items b
         LEFT JOIN sprint_items si ON si.item_id = b.id
         LEFT JOIN sprints s ON s.id = si.sprint_id AND s.estado <> 'cerrado'
        WHERE ${cond.join(' AND ')}
        ORDER BY b.prioridad_orden, b.id`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-019: crear elemento. Solo el Product Owner.
   ------------------------------------------------------------ */
r.post('/', requireRole(['PO'], 'product'), async (req, res, next) => {
  try {
    const {
      codigo, epica, titulo, como, quiero, para,
      criterios_aceptacion, valor_negocio, story_points
    } = req.body;

    if (!titulo) return res.status(400).json({ error: 'titulo es obligatorio' });

    const { rows: max } = await q(
      'SELECT COALESCE(MAX(prioridad_orden),0) + 1 AS siguiente FROM backlog_items WHERE product_id = $1',
      [req.productId]
    );

    const { rows } = await q(
      `INSERT INTO backlog_items
         (product_id, codigo, epica, titulo, como, quiero, para,
          criterios_aceptacion, valor_negocio, story_points, prioridad_orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.productId, codigo ?? null, epica ?? null, titulo, como ?? null, quiero ?? null,
       para ?? null, criterios_aceptacion ?? null, valor_negocio ?? null,
       story_points ?? null, max[0].siguiente]
    );

    await logStatus({
      entidad: 'item', entidadId: rows[0].id, nuevo: 'backlog',
      storyPoints: rows[0].story_points ?? 0, userId: req.user.id
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* Detalle de la historia con sus tareas y su checklist de DoD */
r.get('/:id', requireMember('item'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows: item } = await q('SELECT * FROM backlog_items WHERE id = $1', [id]);
    if (!item[0]) return res.status(404).json({ error: 'Historia no encontrada' });

    const { rows: tareas } = await q(
      `SELECT t.*, u.nombre AS asignado_nombre
         FROM tasks t LEFT JOIN users u ON u.id = t.asignado_a
        WHERE t.item_id = $1 ORDER BY t.id`,
      [id]
    );

    const { rows: dod } = await q(
      `SELECT d.id, d.texto,
              COALESCE(c.cumplido, FALSE) AS cumplido,
              c.fecha, u.nombre AS verificado_por
         FROM dod_criteria d
         LEFT JOIN item_dod_checks c ON c.criterio_id = d.id AND c.item_id = $1
         LEFT JOIN users u ON u.id = c.verificado_por
        WHERE d.product_id = $2 AND d.activo
        ORDER BY d.id`,
      [id, item[0].product_id]
    );

    res.json({ ...item[0], tareas, dod, dod_completo: dod.every((d) => d.cumplido) });
  } catch (err) {
    next(err);
  }
});

/* HU-020: editar. Solo el Product Owner. */
r.put('/:id', requireRole(['PO'], 'item'), async (req, res, next) => {
  try {
    const { codigo, epica, titulo, como, quiero, para, criterios_aceptacion, valor_negocio } = req.body;
    const { rows } = await q(
      `UPDATE backlog_items SET
         codigo = COALESCE($2, codigo),
         epica = COALESCE($3, epica),
         titulo = COALESCE($4, titulo),
         como = COALESCE($5, como),
         quiero = COALESCE($6, quiero),
         para = COALESCE($7, para),
         criterios_aceptacion = COALESCE($8, criterios_aceptacion),
         valor_negocio = COALESCE($9, valor_negocio)
       WHERE id = $1 RETURNING *`,
      [Number(req.params.id), codigo ?? null, epica ?? null, titulo ?? null, como ?? null,
       quiero ?? null, para ?? null, criterios_aceptacion ?? null, valor_negocio ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-021: eliminar. Solo el Product Owner. */
r.delete('/:id', requireRole(['PO'], 'item'), async (req, res, next) => {
  try {
    const { rowCount } = await q('DELETE FROM backlog_items WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-022: ordenar el Product Backlog.
   Es la responsabilidad mas caracteristica del Product Owner:
   ni el Scrum Master ni los Developers pueden reordenarlo.
   Body: { product_id, items: [{ id, orden }] }
   ------------------------------------------------------------ */
r.put('/orden/reorder', requireRole(['PO'], 'product'), async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items debe ser un arreglo [{id, orden}]' });
    }

    await tx(async (c) => {
      for (const { id, orden } of items) {
        await c.query(
          'UPDATE backlog_items SET prioridad_orden = $1 WHERE id = $2 AND product_id = $3',
          [orden, id, req.productId]
        );
      }
    });

    const { rows } = await q(
      'SELECT id, codigo, titulo, prioridad_orden FROM backlog_items WHERE product_id = $1 ORDER BY prioridad_orden',
      [req.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-043 / HU-048: estimar en Story Points.
   Solo los Developers: ellos hacen el trabajo, ellos estiman.
   ------------------------------------------------------------ */
r.put('/:id/points', requireRole(['DEV'], 'item'), async (req, res, next) => {
  try {
    const puntos = Number(req.body.story_points);
    const fibonacci = [0, 1, 2, 3, 5, 8, 13, 21];
    if (!fibonacci.includes(puntos)) {
      return res.status(400).json({
        error: 'Los Story Points deben pertenecer a la serie de Fibonacci',
        permitidos: fibonacci
      });
    }
    const { rows } = await q(
      'UPDATE backlog_items SET story_points = $2 WHERE id = $1 RETURNING *',
      [Number(req.params.id), puntos]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* Mover la historia a "en progreso". Solo Developers. */
r.put('/:id/start', requireRole(['DEV'], 'item'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows: prev } = await q('SELECT estado, story_points FROM backlog_items WHERE id = $1', [id]);
    if (!prev[0]) return res.status(404).json({ error: 'Historia no encontrada' });

    const { rows } = await q(
      `UPDATE backlog_items SET estado = 'en_progreso' WHERE id = $1 RETURNING *`, [id]
    );
    await logStatus({
      entidad: 'item', entidadId: id, sprintId: await sprintDeItem(id),
      anterior: prev[0].estado, nuevo: 'en_progreso',
      storyPoints: prev[0].story_points ?? 0, userId: req.user.id
    });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   HU-086: el Definition of Done BLOQUEA el cierre.
   La rubrica es explicita: si el sistema permite cerrar trabajo
   sin validacion, el criterio 6 cae a Insuficiente.
   Devuelve 422 con la lista de criterios que faltan.
   ============================================================ */
r.put('/:id/done', requireRole(['DEV'], 'item'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const { rows: item } = await q('SELECT * FROM backlog_items WHERE id = $1', [id]);
    if (!item[0]) return res.status(404).json({ error: 'Historia no encontrada' });

    const { rows: faltantes } = await q(
      `SELECT d.id, d.texto
         FROM dod_criteria d
         LEFT JOIN item_dod_checks c ON c.criterio_id = d.id AND c.item_id = $1
        WHERE d.product_id = $2 AND d.activo
          AND COALESCE(c.cumplido, FALSE) = FALSE
        ORDER BY d.id`,
      [id, item[0].product_id]
    );

    if (faltantes.length) {
      return res.status(422).json({
        error: 'La historia no cumple el Definition of Done',
        bloqueado: true,
        faltantes: faltantes.map((f) => f.texto),
        detalle: 'Marque los criterios pendientes antes de cerrar la historia.'
      });
    }

    // Aviso adicional: cerrar una historia con tareas abiertas
    const { rows: abiertas } = await q(
      `SELECT COUNT(*)::int AS n FROM tasks WHERE item_id = $1 AND estado <> 'terminado'`,
      [id]
    );

    const { rows } = await q(
      `UPDATE backlog_items SET estado = 'done' WHERE id = $1 RETURNING *`, [id]
    );

    await logStatus({
      entidad: 'item', entidadId: id, sprintId: await sprintDeItem(id),
      anterior: item[0].estado, nuevo: 'done',
      storyPoints: item[0].story_points ?? 0, userId: req.user.id
    });

    res.json({
      ...rows[0],
      aviso: abiertas[0].n ? `Quedan ${abiertas[0].n} tarea(s) sin terminar en esta historia.` : null
    });
  } catch (err) {
    next(err);
  }
});

export default r;
