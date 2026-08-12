import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* HU-103: consultar la retrospectiva, agrupada como el tablero clasico */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { rows: ret } = await q('SELECT * FROM retros WHERE sprint_id = $1', [sprintId]);
    if (!ret[0]) return res.json({ retro: null, bien: [], mejorar: [], acciones: [] });

    const { rows: notas } = await q(
      `SELECT n.*, a.nombre AS autor, resp.nombre AS responsable
         FROM retro_notes n
         LEFT JOIN users a ON a.id = n.autor_id
         LEFT JOIN users resp ON resp.id = n.responsable_id
        WHERE n.retro_id = $1
        ORDER BY n.votos DESC, n.id`,
      [ret[0].id]
    );

    res.json({
      retro: ret[0],
      bien: notas.filter((n) => n.tipo === 'bien'),
      mejorar: notas.filter((n) => n.tipo === 'mejorar'),
      acciones: notas.filter((n) => n.tipo === 'accion')
    });
  } catch (err) {
    next(err);
  }
});

/* HU-110: seguimiento de las acciones de retrospectivas anteriores */
r.get('/acciones', requireMember('product'), async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT n.id, n.texto, n.estado, n.votos, s.numero AS sprint,
              resp.nombre AS responsable
         FROM retro_notes n
         JOIN retros rt ON rt.id = n.retro_id
         JOIN sprints s ON s.id = rt.sprint_id
         LEFT JOIN users resp ON resp.id = n.responsable_id
        WHERE s.product_id = $1 AND n.tipo = 'accion'
        ORDER BY s.numero DESC, n.votos DESC`,
      [req.productId]
    );
    res.json({
      acciones: rows,
      pendientes: rows.filter((a) => a.estado !== 'hecha').length
    });
  } catch (err) {
    next(err);
  }
});

/* El Scrum Master facilita la retrospectiva */
r.post('/', requireRole(['SM'], 'sprint'), async (req, res, next) => {
  try {
    const { sprint_id } = req.body;
    if (!sprint_id) return res.status(400).json({ error: 'sprint_id es obligatorio' });
    const { rows } = await q(
      `INSERT INTO retros (sprint_id) VALUES ($1)
       ON CONFLICT (sprint_id) DO UPDATE SET sprint_id = EXCLUDED.sprint_id
       RETURNING *`,
      [sprint_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-104 / HU-105 / HU-106: cualquier miembro aporta.
   La retrospectiva es del equipo completo, no del facilitador.
   ------------------------------------------------------------ */
r.post('/:id/notes', requireMember('retro'), async (req, res, next) => {
  try {
    const { tipo, texto, responsable_id } = req.body;
    if (!['bien', 'mejorar', 'accion'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser bien, mejorar o accion' });
    }
    if (!texto?.trim()) return res.status(400).json({ error: 'texto es obligatorio' });

    // HU-108/109: una accion sin responsable no se puede seguir
    if (tipo === 'accion' && !responsable_id) {
      return res.status(422).json({
        error: 'Una accion de mejora necesita responsable',
        detalle: 'Sin responsable no hay seguimiento posible en la siguiente retrospectiva.'
      });
    }

    const { rows } = await q(
      `INSERT INTO retro_notes (retro_id, tipo, texto, autor_id, responsable_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [Number(req.params.id), tipo, texto.trim(), req.user.id, responsable_id ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-107: votar propuestas */
r.put('/notes/:noteId/vote', requireMember('retroNote'), async (req, res, next) => {
  try {
    const { rows } = await q(
      'UPDATE retro_notes SET votos = votos + 1 WHERE id = $1 RETURNING *',
      [Number(req.params.noteId)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-109/110: actualizar responsable o estado de una accion */
r.put('/notes/:noteId', requireMember('retroNote'), async (req, res, next) => {
  try {
    const { estado, responsable_id, texto } = req.body;
    const { rows } = await q(
      `UPDATE retro_notes SET
         estado = COALESCE($2, estado),
         responsable_id = COALESCE($3, responsable_id),
         texto = COALESCE($4, texto)
       WHERE id = $1 RETURNING *`,
      [Number(req.params.noteId), estado ?? null, responsable_id ?? null, texto ?? null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default r;
