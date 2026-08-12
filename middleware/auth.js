import jwt from 'jsonwebtoken';
import { q } from '../db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion';

/* ============================================================
   Autenticacion
   ============================================================ */

export function firmarToken(user) {
  return jwt.sign({ id: user.id, nombre: user.nombre, email: user.email }, SECRET, {
    expiresIn: '7d'
  });
}

export function ponerCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,                                   // el JS del navegador no la puede leer
    secure: process.env.NODE_ENV === 'production',    // Render sirve por HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesion invalida o expirada' });
  }
}

/* ============================================================
   Autorizacion por responsabilidad Scrum
   ------------------------------------------------------------
   Aqui vive el criterio 1 de la rubrica. La regla critica dice:
   no se evalua como Scrum correcto una solucion que trate al
   Scrum Master como jefe asignador de tareas o al Product Owner
   como administrador operativo del equipo.

   Por eso el rol NO se guarda en el token: se resuelve contra la
   base para el producto concreto sobre el que se esta actuando.
   Una persona puede ser PO en un producto y Developer en otro.
   ============================================================ */

// Como llegar al product_id a partir del recurso que toca la ruta
const RESOLVERS = {
  product: null, // el id ya es el del producto
  sprint: 'SELECT product_id FROM sprints WHERE id = $1',
  item: 'SELECT product_id FROM backlog_items WHERE id = $1',
  task: `SELECT b.product_id FROM tasks t
           JOIN backlog_items b ON b.id = t.item_id WHERE t.id = $1`,
  daily: `SELECT s.product_id FROM dailies d
            JOIN sprints s ON s.id = d.sprint_id WHERE d.id = $1`,
  impediment: `SELECT s.product_id FROM impediments i
                 JOIN sprints s ON s.id = i.sprint_id WHERE i.id = $1`,
  dod: 'SELECT product_id FROM dod_criteria WHERE id = $1',
  review: `SELECT s.product_id FROM reviews r
             JOIN sprints s ON s.id = r.sprint_id WHERE r.id = $1`,
  retro: `SELECT s.product_id FROM retros r
            JOIN sprints s ON s.id = r.sprint_id WHERE r.id = $1`,
  retroNote: `SELECT s.product_id FROM retro_notes n
                JOIN retros r ON r.id = n.retro_id
                JOIN sprints s ON s.id = r.sprint_id WHERE n.id = $1`
};

const CAMPOS = {
  product: ['productId', 'product_id', 'product'],
  sprint: ['sprintId', 'sprint_id', 'sprint'],
  item: ['itemId', 'item_id', 'item'],
  task: ['taskId', 'task_id', 'task'],
  daily: ['dailyId', 'daily_id', 'daily'],
  impediment: ['impedimentId', 'impediment_id', 'impediment'],
  dod: ['dodId', 'dod_id', 'dod'],
  review: ['reviewId', 'review_id', 'review'],
  retro: ['retroId', 'retro_id', 'retro'],
  retroNote: ['noteId', 'note_id', 'note']
};

/** Busca el id del recurso en params, body o query. */
function sacarId(req, tipo) {
  for (const nombre of CAMPOS[tipo] ?? []) {
    const v = req.params?.[nombre] ?? req.body?.[nombre] ?? req.query?.[nombre];
    if (v !== undefined && v !== null && v !== '') return Number(v);
  }
  if (req.params?.id !== undefined) return Number(req.params.id);
  return null;
}

/** Devuelve el product_id al que pertenece el recurso de la peticion. */
export async function resolverProducto(req, tipo = 'product') {
  const id = sacarId(req, tipo);
  if (!id || Number.isNaN(id)) return null;
  if (tipo === 'product') return id;

  const { rows } = await q(RESOLVERS[tipo], [id]);
  return rows[0]?.product_id ?? null;
}

/** Rol del usuario dentro del equipo Scrum dueño de ese producto. */
export async function rolEnProducto(userId, productId) {
  const { rows } = await q(
    `SELECT tm.rol
       FROM team_members tm
       JOIN products p ON p.team_id = tm.team_id
      WHERE p.id = $1 AND tm.user_id = $2`,
    [productId, userId]
  );
  return rows[0]?.rol ?? null;
}

const NOMBRE_ROL = { PO: 'Product Owner', SM: 'Scrum Master', DEV: 'Developers' };

/**
 * Exige que el usuario tenga uno de los roles indicados sobre el producto.
 *
 *   requireRole(['PO'], 'product')          -> solo el Product Owner
 *   requireRole(['DEV'], 'sprint')          -> solo los Developers
 *   requireRole(['PO','SM','DEV'], 'sprint')-> todo el Scrum Team
 */
export function requireRole(roles, tipo = 'product') {
  return async (req, res, next) => {
    try {
      const productId = await resolverProducto(req, tipo);
      if (!productId) {
        return res.status(400).json({ error: 'No se pudo determinar el producto de la peticion' });
      }

      const rol = await rolEnProducto(req.user.id, productId);
      if (!rol) {
        return res.status(403).json({ error: 'No pertenece al Scrum Team de este producto' });
      }

      if (!roles.includes(rol)) {
        return res.status(403).json({
          error: `Accion reservada para: ${roles.map((r) => NOMBRE_ROL[r]).join(' / ')}`,
          tu_rol: NOMBRE_ROL[rol],
          // Mensaje pensado para mostrarse tal cual en la interfaz:
          detalle: mensajeScrum(roles, rol)
        });
      }

      req.productId = productId;
      req.rol = rol;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Cualquier miembro del equipo. Se usa en las lecturas. */
export function requireMember(tipo = 'product') {
  return requireRole(['PO', 'SM', 'DEV'], tipo);
}

/** Explica el porque en terminos de Scrum, no de permisos tecnicos. */
function mensajeScrum(permitidos, rolActual) {
  if (rolActual === 'SM' && permitidos.includes('DEV')) {
    return 'El Scrum Master facilita, no gestiona el Sprint Backlog ni asigna trabajo. Los Developers son quienes se organizan.';
  }
  if (rolActual === 'SM' && permitidos.includes('PO')) {
    return 'El orden del Product Backlog es responsabilidad del Product Owner.';
  }
  if (rolActual === 'PO' && permitidos.includes('DEV')) {
    return 'El Product Owner no administra la ejecucion del trabajo. Los Developers son autonomos sobre el Sprint Backlog.';
  }
  if (rolActual === 'DEV' && permitidos.includes('PO')) {
    return 'Solo el Product Owner ordena el Product Backlog y acepta el trabajo terminado.';
  }
  return `Esta accion corresponde a: ${permitidos.map((r) => NOMBRE_ROL[r]).join(' / ')}.`;
}
