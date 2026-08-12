import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { firmarToken, ponerCookie, requireAuth } from '../middleware/auth.js';

const r = Router();

/* HU-001: Registro de usuario */
r.post('/register', async (req, res, next) => {
  try {
    const { nombre, email, password, especialidad, disponibilidad_horas } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await q(
      `INSERT INTO users (nombre, email, password_hash, especialidad, disponibilidad_horas)
       VALUES ($1, LOWER($2), $3, $4, COALESCE($5, 8))
       RETURNING id, nombre, email, especialidad, disponibilidad_horas`,
      [nombre, email, hash, especialidad ?? null, disponibilidad_horas ?? null]
    );

    const user = rows[0];
    ponerCookie(res, firmarToken(user));
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese correo ya esta registrado' });
    next(err);
  }
});

/* HU-002: Inicio de sesion */
r.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { rows } = await q('SELECT * FROM users WHERE email = LOWER($1)', [email ?? '']);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password ?? '', user.password_hash))) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });
    }

    ponerCookie(res, firmarToken(user));
    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      especialidad: user.especialidad,
      disponibilidad_horas: user.disponibilidad_horas
    });
  } catch (err) {
    next(err);
  }
});

r.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

/* Usuario actual, con los productos donde participa y su rol en cada uno */
r.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT u.id, u.nombre, u.email, u.especialidad, u.disponibilidad_horas
         FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { rows: productos } = await q(
      `SELECT p.id, p.nombre, p.product_goal, tm.rol
         FROM products p
         JOIN team_members tm ON tm.team_id = p.team_id
        WHERE tm.user_id = $1
        ORDER BY p.id`,
      [req.user.id]
    );

    res.json({ ...rows[0], productos });
  } catch (err) {
    next(err);
  }
});

/* HU-004 / HU-006: perfil y disponibilidad */
r.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { nombre, especialidad, disponibilidad_horas } = req.body;
    const { rows } = await q(
      `UPDATE users SET
         nombre = COALESCE($2, nombre),
         especialidad = COALESCE($3, especialidad),
         disponibilidad_horas = COALESCE($4, disponibilidad_horas)
       WHERE id = $1
       RETURNING id, nombre, email, especialidad, disponibilidad_horas`,
      [req.user.id, nombre ?? null, especialidad ?? null, disponibilidad_horas ?? null]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default r;
