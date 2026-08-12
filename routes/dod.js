import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* HU-084: consultar el Definition of Done del producto */
r.get('/', requireMember('product'), async (req, res, next) => {
  try {
    const { rows } = await q(
      'SELECT * FROM dod_criteria WHERE product_id = $1 AND activo ORDER BY id',
      [req.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-084: el DoD lo define TODO el Scrum Team, no una persona.
   Por eso los tres roles pueden crear criterios.
   ------------------------------------------------------------ */
r.post('/', requireRole(['PO', 'SM', 'DEV'], 'product'), async (req, res, next) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'texto es obligatorio' });
    const { rows } = await q(
      'INSERT INTO dod_criteria (product_id, texto) VALUES ($1,$2) RETURNING *',
      [req.productId, texto.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

r.delete('/:id', requireRole(['PO', 'SM', 'DEV'], 'dod'), async (req, res, next) => {
  try {
    const { rows } = await q(
      'UPDATE dod_criteria SET activo = FALSE WHERE id = $1 RETURNING *',
      [Number(req.params.id)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Criterio no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* Checklist de una historia, con lo que falta para poder cerrarla */
r.get('/item/:itemId', requireMember('item'), async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    const { rows: item } = await q('SELECT product_id, titulo FROM backlog_items WHERE id = $1', [itemId]);
    if (!item[0]) return res.status(404).json({ error: 'Historia no encontrada' });

    const { rows } = await q(
      `SELECT d.id, d.texto,
              COALESCE(c.cumplido, FALSE) AS cumplido,
              c.fecha, u.nombre AS verificado_por
         FROM dod_criteria d
         LEFT JOIN item_dod_checks c ON c.criterio_id = d.id AND c.item_id = $1
         LEFT JOIN users u ON u.id = c.verificado_por
        WHERE d.product_id = $2 AND d.activo
        ORDER BY d.id`,
      [itemId, item[0].product_id]
    );

    const faltantes = rows.filter((d) => !d.cumplido);
    res.json({
      historia: item[0].titulo,
      criterios: rows,
      cumplidos: rows.length - faltantes.length,
      total: rows.length,
      puede_cerrarse: faltantes.length === 0,
      faltantes: faltantes.map((f) => f.texto)
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-085: marcar un criterio. Solo los Developers validan su
   propio trabajo contra el DoD.
   Body: { item_id, criterio_id, cumplido }
   ------------------------------------------------------------ */
r.put('/check', requireRole(['DEV'], 'item'), async (req, res, next) => {
  try {
    const { item_id, criterio_id, cumplido } = req.body;
    if (!item_id || !criterio_id) {
      return res.status(400).json({ error: 'item_id y criterio_id son obligatorios' });
    }
    const marcado = cumplido !== false;

    await q(
      `INSERT INTO item_dod_checks (item_id, criterio_id, cumplido, verificado_por, fecha)
       VALUES ($1,$2,$3,$4, CASE WHEN $3 THEN NOW() ELSE NULL END)
       ON CONFLICT (item_id, criterio_id) DO UPDATE
         SET cumplido = EXCLUDED.cumplido,
             verificado_por = EXCLUDED.verificado_por,
             fecha = EXCLUDED.fecha`,
      [item_id, criterio_id, marcado, req.user.id]
    );

    const { rows } = await q(
      `SELECT COUNT(*) FILTER (WHERE COALESCE(c.cumplido,FALSE)) ::int AS cumplidos,
              COUNT(*)::int AS total
         FROM dod_criteria d
         LEFT JOIN item_dod_checks c ON c.criterio_id = d.id AND c.item_id = $1
        WHERE d.product_id = (SELECT product_id FROM backlog_items WHERE id = $1) AND d.activo`,
      [item_id]
    );

    res.json({ ...rows[0], puede_cerrarse: rows[0].cumplidos === rows[0].total });
  } catch (err) {
    next(err);
  }
});

export default r;
