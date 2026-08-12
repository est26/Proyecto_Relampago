import { Router } from 'express';
import { q, tx } from '../db.js';
import { requireAuth, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* HU-075: el Scrum Master consulta las actualizaciones del equipo */
r.get('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const sprintId = Number(req.query.sprint);

    // HU-075: sin un sprint valido no hay forma de saber que dailies
    // consultar; se responde 400 en vez de dejar pasar un NaN silencioso
    // que hubiera devuelto una lista vacia confundiendo al Scrum Master.
    if (!sprintId) {
      return res.status(400).json({ error: 'sprint es obligatorio y debe ser numerico' });
    }

    const { fecha } = req.query;

    const params = [sprintId];
    let filtro = '';
    if (fecha) { params.push(fecha); filtro = `AND d.fecha = $${params.length}`; }

    const { rows } = await q(
      `SELECT d.*, u.nombre AS autor
         FROM dailies d JOIN users u ON u.id = d.user_id
        WHERE d.sprint_id = $1 ${filtro}
        ORDER BY d.fecha DESC, u.nombre`,
      params
    );

    // HU-076: quien no ha registrado su actualizacion de hoy.
    // Solo se revisan Developers porque son quienes reportan avance
    // de tareas; PO y SM no tienen Daily obligatorio en este modelo.
    const { rows: faltan } = await q(
      `SELECT u.id, u.nombre
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         JOIN products p ON p.team_id = tm.team_id
         JOIN sprints s ON s.product_id = p.id
        WHERE s.id = $1 AND tm.rol = 'DEV'
          AND NOT EXISTS (
            SELECT 1 FROM dailies d
             WHERE d.sprint_id = s.id AND d.user_id = u.id AND d.fecha = CURRENT_DATE)`,
      [sprintId]
    );

    res.json({ dailies: rows, sin_registrar_hoy: faltan });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   HU-074: registrar el Daily Scrum.
   HU-077: si se reporta un impedimento, se crea automaticamente
   como impedimento con seguimiento propio.
   Cada quien registra el suyo: nadie reporta por otro.
   ------------------------------------------------------------ */
r.post('/', requireMember('sprint'), async (req, res, next) => {
  try {
    const { sprint_id, prioridad } = req.body;
    if (!sprint_id) return res.status(400).json({ error: 'sprint_id es obligatorio' });

    // HU-074: se recortan los tres campos de texto para que un Daily
    // de solo espacios en blanco no cuente como "registrado" ante
    // el chequeo de sin_registrar_hoy.
    const avance = req.body.avance?.trim() || null;
    const siguiente = req.body.siguiente?.trim() || null;
    const impedimento_txt = req.body.impedimento_txt?.trim() || null;

    const resultado = await tx(async (c) => {
      const { rows: d } = await c.query(
        `INSERT INTO dailies (sprint_id, user_id, fecha, avance, siguiente, impedimento_txt)
         VALUES ($1,$2,CURRENT_DATE,$3,$4,$5)
         ON CONFLICT (sprint_id, user_id, fecha) DO UPDATE
           SET avance = EXCLUDED.avance,
               siguiente = EXCLUDED.siguiente,
               impedimento_txt = EXCLUDED.impedimento_txt
         RETURNING *`,
        [sprint_id, req.user.id, avance, siguiente, impedimento_txt]
      );

      // HU-077: se verifica si el Daily de hoy ya genero un impedimento
      // antes de crear otro, para que editar el mismo Daily dos veces
      // en el dia no duplique el impedimento asociado.
      let impedimento = null;
      if (impedimento_txt) {
        const { rows: existe } = await c.query(
          `SELECT id FROM impediments WHERE daily_id = $1`, [d[0].id]
        );
        if (!existe[0]) {
          const { rows: i } = await c.query(
            `INSERT INTO impediments (sprint_id, daily_id, descripcion, prioridad, reportado_por)
             VALUES ($1,$2,$3,COALESCE($4,'media'),$5) RETURNING *`,
            [sprint_id, d[0].id, impedimento_txt, prioridad ?? null, req.user.id]
          );
          impedimento = i[0];
        }
      }
      return { daily: d[0], impedimento_creado: impedimento };
    });

    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

export default r;