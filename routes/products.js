import { Router } from 'express';
import { q, tx } from '../db.js';
import { requireAuth, requireRole, requireMember } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

/* Productos donde participa el usuario */
r.get('/', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT p.*, tm.rol, t.nombre AS equipo
         FROM products p
         JOIN teams t ON t.id = p.team_id
         JOIN team_members tm ON tm.team_id = p.team_id
        WHERE tm.user_id = $1
        ORDER BY p.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* HU-013/014/015/016: crear producto. Quien lo crea queda como Product Owner. */
r.post('/', async (req, res, next) => {
  try {
    const { nombre, product_goal, vision, descripcion, equipo } = req.body;
    if (!nombre || !product_goal) {
      return res.status(400).json({
        error: 'nombre y product_goal son obligatorios',
        detalle: 'Un producto sin Product Goal no orienta al Scrum Team.'
      });
    }

    const producto = await tx(async (c) => {
      const { rows: t } = await c.query(
        'INSERT INTO teams (nombre) VALUES ($1) RETURNING id',
        [equipo || `Equipo ${nombre}`]
      );
      const teamId = t[0].id;

      await c.query(
        `INSERT INTO team_members (team_id, user_id, rol, capacidad_horas)
         VALUES ($1, $2, 'PO', 0)`,
        [teamId, req.user.id]
      );

      const { rows: p } = await c.query(
        `INSERT INTO products (team_id, nombre, vision, product_goal, descripcion)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [teamId, nombre, vision ?? null, product_goal, descripcion ?? null]
      );

      // Definition of Done inicial, editable despues por el Scrum Team
      const base = [
        'Codigo desarrollado e integrado en la rama principal',
        'Criterios de aceptacion cumplidos y verificados',
        'Code Review realizado por otro Developer',
        'Pruebas funcionales aprobadas'
      ];
      for (const texto of base) {
        await c.query('INSERT INTO dod_criteria (product_id, texto) VALUES ($1,$2)', [p[0].id, texto]);
      }

      return p[0];
    });

    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
});

/* Detalle del producto: equipo, capacidad y DoD */
r.get('/:id', requireMember('product'), async (req, res, next) => {
  try {
    const { rows: p } = await q('SELECT * FROM products WHERE id = $1', [req.productId]);
    const { rows: equipo } = await q(
      `SELECT u.id, u.nombre, u.email, u.especialidad, tm.rol, tm.capacidad_horas
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         JOIN products p ON p.team_id = tm.team_id
        WHERE p.id = $1
        ORDER BY CASE tm.rol WHEN 'PO' THEN 1 WHEN 'SM' THEN 2 ELSE 3 END, u.nombre`,
      [req.productId]
    );
    const { rows: dod } = await q(
      'SELECT * FROM dod_criteria WHERE product_id = $1 AND activo ORDER BY id',
      [req.productId]
    );

    res.json({
      ...p[0],
      mi_rol: req.rol,
      equipo,
      capacidad_equipo: equipo.filter((m) => m.rol === 'DEV').reduce((s, m) => s + m.capacidad_horas, 0),
      dod
    });
  } catch (err) {
    next(err);
  }
});

/* HU-015: solo el Product Owner define el Product Goal */
r.put('/:id/goal', requireRole(['PO'], 'product'), async (req, res, next) => {
  try {
    const { product_goal, vision, descripcion } = req.body;
    const { rows } = await q(
      `UPDATE products SET
         product_goal = COALESCE($2, product_goal),
         vision       = COALESCE($3, vision),
         descripcion  = COALESCE($4, descripcion)
       WHERE id = $1 RETURNING *`,
      [req.productId, product_goal ?? null, vision ?? null, descripcion ?? null]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-010: consultar el Scrum Team */
r.get('/:id/team', requireMember('product'), async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT u.id, u.nombre, u.email, u.especialidad, u.disponibilidad_horas,
              tm.rol, tm.capacidad_horas
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         JOIN products p ON p.team_id = tm.team_id
        WHERE p.id = $1
        ORDER BY CASE tm.rol WHEN 'PO' THEN 1 WHEN 'SM' THEN 2 ELSE 3 END, u.nombre`,
      [req.productId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* HU-008/009: invitar y asignar responsabilidades. PO o SM. */
r.post('/:id/members', requireRole(['PO', 'SM'], 'product'), async (req, res, next) => {
  try {
    const { email, rol, capacidad_horas } = req.body;
    if (!['PO', 'SM', 'DEV'].includes(rol)) {
      return res.status(400).json({ error: 'rol debe ser PO, SM o DEV' });
    }

    const { rows: u } = await q('SELECT id FROM users WHERE email = LOWER($1)', [email ?? '']);
    if (!u[0]) return res.status(404).json({ error: 'No existe un usuario con ese correo' });

    const { rows: p } = await q('SELECT team_id FROM products WHERE id = $1', [req.productId]);

    // Un Scrum Team tiene un unico Product Owner y un unico Scrum Master
    if (rol !== 'DEV') {
      const { rows: ya } = await q(
        'SELECT user_id FROM team_members WHERE team_id = $1 AND rol = $2 AND user_id <> $3',
        [p[0].team_id, rol, u[0].id]
      );
      if (ya.length) {
        return res.status(409).json({
          error: `El equipo ya tiene un ${rol === 'PO' ? 'Product Owner' : 'Scrum Master'}`,
          detalle: 'Segun Scrum, esa responsabilidad recae en una sola persona.'
        });
      }
    }

    const { rows } = await q(
      `INSERT INTO team_members (team_id, user_id, rol, capacidad_horas)
       VALUES ($1,$2,$3,COALESCE($4,0))
       ON CONFLICT (team_id, user_id)
         DO UPDATE SET rol = EXCLUDED.rol, capacidad_horas = EXCLUDED.capacidad_horas
       RETURNING *`,
      [p[0].team_id, u[0].id, rol, capacidad_horas ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* HU-006/011: cada quien declara su propia capacidad para el Sprint */
r.put('/:id/capacity', requireMember('product'), async (req, res, next) => {
  try {
    const { capacidad_horas } = req.body;
    const { rows: p } = await q('SELECT team_id FROM products WHERE id = $1', [req.productId]);
    const { rows } = await q(
      `UPDATE team_members SET capacidad_horas = $3
        WHERE team_id = $1 AND user_id = $2 RETURNING *`,
      [p[0].team_id, req.user.id, Number(capacidad_horas) || 0]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default r;
