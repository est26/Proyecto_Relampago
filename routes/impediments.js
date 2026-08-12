import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* ------------------------------------------------------------
   HU-081 / HU-082: seguimiento visible.
   Devuelve la antiguedad en horas para que el equipo vea cuanto
   lleva abierto cada impedimento.
   ------------------------------------------------------------ */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);
    const { rows } = await q(
      `SELECT i.*,
              rep.nombre AS reportado_por_nombre,
              resp.nombre AS responsable_nombre,
              ROUND(EXTRACT(EPOCH FROM (COALESCE(i.resuelto_en, NOW()) - i.creado_en)) / 3600)::int
                AS horas_abierto
         FROM impediments i
         LEFT JOIN users rep  ON rep.id  = i.reportado_por
         LEFT JOIN users resp ON resp.id = i.responsable_id
        WHERE i.sprint_id = $1
        ORDER BY
          CASE i.estado WHEN 'abierto' THEN 1 WHEN 'gestionando' THEN 2
                        WHEN 'escalado' THEN 3 ELSE 4 END,
          CASE i.prioridad WHEN 'critica' THEN 1 WHEN 'alta' THEN 2
                           WHEN 'media' THEN 3 ELSE 4 END,
          i.creado_en`,
      [sprintId]
    );

    res.json({
      impedimentos: rows,
      abiertos: rows.filter((i) => i.estado !== 'resuelto').length,
      mas_antiguo: rows.find((i) => i.estado !== 'resuelto')?.horas_abierto ?? 0
    });
  } catch (err) {
    next(err);
  }
});

/* HU-078: cualquier miembro puede reportar un impedimento */
r.post('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const { sprint_id, descripcion, prioridad } = req.body;
    if (!sprint_id || !descripcion) {
      return res.status(400).json({ error: 'sprint_id y descripcion son obligatorios' });
    }
    const { rows } = await q(
      `INSERT INTO impediments (sprint_id, descripcion, prioridad, reportado_por)
       VALUES ($1,$2,COALESCE($3,'media'),$4) RETURNING *`,
      [sprint_id, descripcion, prioridad ?? null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-079 / HU-080 / HU-083: priorizar, asignar seguimiento y escalar.
   Es del Scrum Master: remover impedimentos SI es su responsabilidad.
   Aqui su autoridad es legitima; sobre el Sprint Backlog no lo es.
   ------------------------------------------------------------ */
r.put('/:id', requireRole(['SM'], 'impediment'), async (req, res, next) => {
  try {
    const { prioridad, estado, responsable_id } = req.body;
    const cerrar = estado === 'resuelto';

    const { rows } = await q(
      `UPDATE impediments SET
         prioridad = COALESCE($2, prioridad),
         estado = COALESCE($3, estado),
         responsable_id = COALESCE($4, responsable_id),
         resuelto_en = CASE WHEN $5 THEN NOW() ELSE resuelto_en END
       WHERE id = $1 RETURNING *`,
      [Number(req.params.id), prioridad ?? null, estado ?? null, responsable_id ?? null, cerrar]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Impedimento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default r;
