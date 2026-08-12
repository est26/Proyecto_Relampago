import { Router } from 'express';
import { q, tx, logStatus } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* HU-053: consultar Sprints actuales, futuros y finalizados */
r.get('/', requireMember('product'), async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT s.*,
              COALESCE(SUM(si.puntos_comprometidos),0)::int AS puntos_comprometidos,
              COALESCE(SUM(CASE WHEN b.estado = 'done' THEN b.story_points END),0)::int AS puntos_completados,
              COUNT(si.item_id)::int AS historias
         FROM sprints s
         LEFT JOIN sprint_items si ON si.sprint_id = s.id
         LEFT JOIN backlog_items b ON b.id = si.item_id
        WHERE s.product_id = $1
        GROUP BY s.id
        ORDER BY s.numero DESC`,
      [req.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* HU-049/050/052: crear Sprint. Lo abre el Scrum Master como facilitador. */
r.post('/', requireRole(['SM'], 'product'), async (req, res, next) => {
  try {
    // HU-049/050: se recorta el sprint_goal para que un texto de solo
    // espacios en blanco no pase la validacion de "obligatorio".
    const { fecha_inicio, fecha_fin } = req.body;
    const sprint_goal = req.body.sprint_goal?.trim();
    if (!sprint_goal || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'sprint_goal, fecha_inicio y fecha_fin son obligatorios' });
    }
    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la de inicio' });
    }

    const { rows: abierto } = await q(
      `SELECT id, numero FROM sprints WHERE product_id = $1 AND estado = 'activo'`,
      [req.productId]
    );
    if (abierto[0]) {
      return res.status(409).json({
        error: `El Sprint ${abierto[0].numero} sigue activo`,
        detalle: 'Cierre el Sprint en curso antes de abrir el siguiente.'
      });
    }

    const { rows: n } = await q(
      'SELECT COALESCE(MAX(numero),0) + 1 AS siguiente FROM sprints WHERE product_id = $1',
      [req.productId]
    );

    const { rows } = await q(
      `INSERT INTO sprints (product_id, numero, sprint_goal, fecha_inicio, fecha_fin, estado)
       VALUES ($1,$2,$3,$4,$5,'planificado') RETURNING *`,
      [req.productId, n[0].siguiente, sprint_goal, fecha_inicio, fecha_fin]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* Detalle del Sprint: Sprint Backlog, capacidad y avance */
r.get('/:id', requireMember('sprint'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows: s } = await q('SELECT * FROM sprints WHERE id = $1', [id]);
    if (!s[0]) return res.status(404).json({ error: 'Sprint no encontrado' });

    const { rows: items } = await q(
      `SELECT b.*, si.puntos_comprometidos,
              (SELECT COUNT(*) FROM tasks t WHERE t.item_id = b.id)::int AS total_tareas,
              (SELECT COUNT(*) FROM tasks t WHERE t.item_id = b.id AND t.estado='terminado')::int AS tareas_listas
         FROM sprint_items si
         JOIN backlog_items b ON b.id = si.item_id
        WHERE si.sprint_id = $1
        ORDER BY b.prioridad_orden`,
      [id]
    );

    const { rows: cap } = await q(
      `SELECT COALESCE(SUM(tm.capacidad_horas),0)::int AS capacidad
         FROM team_members tm
         JOIN products p ON p.team_id = tm.team_id
        WHERE p.id = $1 AND tm.rol = 'DEV'`,
      [s[0].product_id]
    );

    const { rows: horas } = await q(
      `SELECT COALESCE(SUM(t.horas_estimadas),0)::float AS comprometidas
         FROM tasks t JOIN sprint_items si ON si.item_id = t.item_id
        WHERE si.sprint_id = $1`,
      [id]
    );

    const comprometidos = items.reduce((a, i) => a + (i.puntos_comprometidos || 0), 0);
    const completados = items.filter((i) => i.estado === 'done')
                             .reduce((a, i) => a + (i.story_points || 0), 0);

    const hoy = new Date();
    const fin = new Date(s[0].fecha_fin);
    const diasRestantes = Math.max(0, Math.ceil((fin - hoy) / 86_400_000));

    res.json({
      ...s[0],
      mi_rol: req.rol,
      items,
      dias_restantes: diasRestantes,
      puntos_comprometidos: comprometidos,
      puntos_completados: completados,
      porcentaje: comprometidos ? Math.round((completados / comprometidos) * 100) : 0,
      capacidad_horas: cap[0].capacidad,          // HU-011 / HU-057
      horas_comprometidas: horas[0].comprometidas
    });
  } catch (err) {
    next(err);
  }
});

/* HU-057: capacidad disponible del equipo.
   Suma las horas de TODOS los Developers del producto (no solo los
   asignados a este Sprint), y las compara contra lo ya comprometido
   en tareas de este Sprint especifico, via el join con sprint_items. */
r.get('/:id/capacity', requireMember('sprint'), async (req, res, next) => {
  try {
    const { rows: s } = await q('SELECT product_id FROM sprints WHERE id = $1', [Number(req.params.id)]);
    const { rows } = await q(
      `SELECT u.id, u.nombre, tm.capacidad_horas
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         JOIN products p ON p.team_id = tm.team_id
        WHERE p.id = $1 AND tm.rol = 'DEV'
        ORDER BY u.nombre`,
      [s[0].product_id]
    );
    const { rows: h } = await q(
      `SELECT COALESCE(SUM(t.horas_estimadas),0)::float AS comprometidas
         FROM tasks t JOIN sprint_items si ON si.item_id = t.item_id
        WHERE si.sprint_id = $1`,
      [Number(req.params.id)]
    );
    const total = rows.reduce((a, m) => a + m.capacidad_horas, 0);
    res.json({
      developers: rows,
      capacidad_total: total,
      horas_comprometidas: h[0].comprometidas,
      disponible: total - h[0].comprometidas
    });
  } catch (err) {
    next(err);
  }
});

/* HU-052: el Sprint Goal lo define TODO el Scrum Team durante el Planning */
r.put('/:id/goal', requireRole(['PO', 'SM', 'DEV'], 'sprint'), async (req, res, next) => {
  try {
    const { sprint_goal } = req.body;
    if (!sprint_goal) return res.status(400).json({ error: 'sprint_goal es obligatorio' });
    const { rows } = await q(
      'UPDATE sprints SET sprint_goal = $2 WHERE id = $1 RETURNING *',
      [Number(req.params.id), sprint_goal]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Sprint no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ============================================================
   HU-058 / HU-061: conformar el Sprint Backlog.
   Solo los Developers seleccionan el trabajo. Es el punto donde
   la rubrica exige autonomia del equipo de desarrollo.
   Body: { items: [id, id, ...] }
   ============================================================ */
r.post('/:id/items', requireRole(['DEV'], 'sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.params.id);

    // HU-058/061: se eliminan ids repetidos por si el frontend los manda
    // duplicados (doble clic, doble tap en movil, etc).
    const items = Array.isArray(req.body.items)
      ? [...new Set(req.body.items)]
      : null;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'items debe ser un arreglo de ids de historias' });
    }

    const { rows: s } = await q('SELECT * FROM sprints WHERE id = $1', [sprintId]);
    if (s[0].estado === 'cerrado') {
      return res.status(409).json({ error: 'No se puede modificar el Sprint Backlog de un Sprint cerrado' });
    }

    const agregados = await tx(async (c) => {
      const out = [];
      for (const itemId of items) {
        const { rows: it } = await c.query(
          'SELECT * FROM backlog_items WHERE id = $1 AND product_id = $2',
          [itemId, s[0].product_id]
        );
        if (!it[0]) continue;

        if (it[0].story_points === null) {
          throw Object.assign(
            new Error(`La historia "${it[0].titulo}" no tiene Story Points`),
            { status: 422, detalle: 'Los Developers deben estimar antes de comprometer trabajo.' }
          );
        }

        await c.query(
          `INSERT INTO sprint_items (sprint_id, item_id, puntos_comprometidos)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [sprintId, itemId, it[0].story_points]
        );
        await c.query(`UPDATE backlog_items SET estado = 'sprint' WHERE id = $1`, [itemId]);
        await logStatus({
          entidad: 'item', entidadId: itemId, sprintId,
          anterior: it[0].estado, nuevo: 'sprint',
          storyPoints: it[0].story_points, userId: req.user.id
        }, c);

        out.push(it[0].titulo);
      }
      return out;
    });

    res.status(201).json({ agregados, total: agregados.length });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({ error: err.message, detalle: err.detalle });
    }
    next(err);
  }
});

/* Sacar una historia del Sprint Backlog. Solo Developers. */
r.delete('/:id/items/:itemId', requireRole(['DEV'], 'sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    await tx(async (c) => {
      await c.query('DELETE FROM sprint_items WHERE sprint_id = $1 AND item_id = $2', [sprintId, itemId]);
      await c.query(`UPDATE backlog_items SET estado = 'backlog' WHERE id = $1`, [itemId]);
      await logStatus({
        entidad: 'item', entidadId: itemId, sprintId,
        anterior: 'sprint', nuevo: 'backlog', userId: req.user.id
      }, c);
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* Iniciar el Sprint */
r.put('/:id/activate', requireRole(['SM'], 'sprint'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows: items } = await q('SELECT COUNT(*)::int AS n FROM sprint_items WHERE sprint_id = $1', [id]);
    if (!items[0].n) {
      return res.status(422).json({
        error: 'El Sprint no tiene Sprint Backlog',
        detalle: 'Los Developers deben seleccionar el trabajo antes de iniciar el Sprint.'
      });
    }
    const { rows } = await q(
      `UPDATE sprints SET estado = 'activo' WHERE id = $1 AND estado = 'planificado' RETURNING *`, [id]
    );
    if (!rows[0]) return res.status(409).json({ error: 'El Sprint no esta en estado planificado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-054: cerrar el Sprint.
   Exige Review y Retrospective registrados: sin evidencia de los
   eventos no hay cierre. Las historias no terminadas regresan al
   Product Backlog, como manda Scrum.
   ------------------------------------------------------------ */
r.put('/:id/close', requireRole(['SM'], 'sprint'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const { rows: ev } = await q(
      `SELECT (SELECT COUNT(*) FROM reviews WHERE sprint_id = $1)::int AS review,
              (SELECT COUNT(*) FROM retros  WHERE sprint_id = $1)::int AS retro`,
      [id]
    );
    if (!ev[0].review || !ev[0].retro) {
      return res.status(422).json({
        error: 'No se puede cerrar el Sprint sin evidencia de los eventos',
        faltantes: [
          !ev[0].review ? 'Sprint Review' : null,
          !ev[0].retro ? 'Sprint Retrospective' : null
        ].filter(Boolean)
      });
    }

    const resultado = await tx(async (c) => {
      const { rows: pendientes } = await c.query(
        `SELECT b.id, b.titulo, b.estado, b.story_points
           FROM sprint_items si JOIN backlog_items b ON b.id = si.item_id
          WHERE si.sprint_id = $1 AND b.estado <> 'done'`,
        [id]
      );

      for (const p of pendientes) {
        await c.query(`UPDATE backlog_items SET estado = 'backlog' WHERE id = $1`, [p.id]);
        await logStatus({
          entidad: 'item', entidadId: p.id, sprintId: id,
          anterior: p.estado, nuevo: 'backlog',
          storyPoints: p.story_points ?? 0, userId: req.user.id
        }, c);
      }

      const { rows: s } = await c.query(
        `UPDATE sprints SET estado = 'cerrado' WHERE id = $1 RETURNING *`, [id]
      );
      // Se devuelven los titulos (no solo ids) para que el frontend pueda
      // mostrarle al Scrum Master, sin otra consulta, que historias
      // regresaron al Product Backlog al cerrar el Sprint.
      return { sprint: s[0], devueltas: pendientes.map((p) => p.titulo) };
    });

    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

export default r;
