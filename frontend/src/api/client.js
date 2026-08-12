/**
 * Cliente de la API.
 * Mismo origen que el backend en produccion (Express sirve el build),
 * y proxy de Vite en desarrollo. Por eso nunca hay CORS.
 */

const BASE = '/api';

export class ApiError extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.error || `Error ${status}`);
    this.status = status;
    this.detalle = cuerpo?.detalle;      // explicacion en terminos de Scrum
    this.faltantes = cuerpo?.faltantes;  // criterios de DoD sin cumplir
    this.tuRol = cuerpo?.tu_rol;
    this.cuerpo = cuerpo;
  }
  /** Texto listo para mostrarle a la persona. */
  get mensaje() {
    if (this.faltantes?.length) return `${this.message}: ${this.faltantes.join(' · ')}`;
    return this.detalle ? `${this.message}. ${this.detalle}` : this.message;
  }
}

async function pedir(metodo, ruta, cuerpo) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }

  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const api = {
  get: (r) => pedir('GET', r),
  post: (r, b) => pedir('POST', r, b),
  put: (r, b) => pedir('PUT', r, b),
  del: (r) => pedir('DELETE', r),

  /* --- Autenticacion --- */
  login: (email, password) => pedir('POST', '/auth/login', { email, password }),
  registrar: (datos) => pedir('POST', '/auth/register', datos),
  salir: () => pedir('POST', '/auth/logout'),
  yo: () => pedir('GET', '/auth/me'),

  /* --- Producto --- */
  producto: (id) => pedir('GET', `/products/${id}`),
  equipo: (id) => pedir('GET', `/products/${id}/team`),
  guardarGoal: (id, body) => pedir('PUT', `/products/${id}/goal`, body),
  miCapacidad: (id, horas) => pedir('PUT', `/products/${id}/capacity`, { capacidad_horas: horas }),

  /* --- Backlog --- */
  backlog: (producto, filtros = {}) => {
    const p = new URLSearchParams({ product: producto, ...filtros });
    return pedir('GET', `/backlog?${p}`);
  },
  historia: (id) => pedir('GET', `/backlog/${id}`),
  crearHistoria: (b) => pedir('POST', '/backlog', b),
  editarHistoria: (id, b) => pedir('PUT', `/backlog/${id}`, b),
  borrarHistoria: (id) => pedir('DELETE', `/backlog/${id}`),
  reordenar: (producto, items) => pedir('PUT', '/backlog/orden/reorder', { product_id: producto, items }),
  estimar: (id, puntos) => pedir('PUT', `/backlog/${id}/points`, { story_points: puntos }),
  cerrarHistoria: (id) => pedir('PUT', `/backlog/${id}/done`),

  /* --- Sprints --- */
  sprints: (producto) => pedir('GET', `/sprints?product=${producto}`),
  sprint: (id) => pedir('GET', `/sprints/${id}`),
  crearSprint: (b) => pedir('POST', '/sprints', b),
  sprintGoal: (id, goal) => pedir('PUT', `/sprints/${id}/goal`, { sprint_goal: goal }),
  capacidad: (id) => pedir('GET', `/sprints/${id}/capacity`),
  comprometer: (id, items) => pedir('POST', `/sprints/${id}/items`, { items }),
  descomprometer: (id, itemId) => pedir('DELETE', `/sprints/${id}/items/${itemId}`),
  activarSprint: (id) => pedir('PUT', `/sprints/${id}/activate`),
  cerrarSprint: (id) => pedir('PUT', `/sprints/${id}/close`),

  /* --- Tablero --- */
  tablero: (sprint) => pedir('GET', `/tasks?sprint=${sprint}`),
  crearTarea: (b) => pedir('POST', '/tasks', b),
  moverTarea: (id, estado) => pedir('PUT', `/tasks/${id}/status`, { estado }),
  asumirTarea: (id) => pedir('PUT', `/tasks/${id}/assign`, {}),
  bloquearTarea: (id, bloqueada) => pedir('PUT', `/tasks/${id}/block`, { bloqueada }),

  /* --- Daily e impedimentos --- */
  dailies: (sprint) => pedir('GET', `/dailies?sprint=${sprint}`),
  guardarDaily: (b) => pedir('POST', '/dailies', b),
  impedimentos: (sprint) => pedir('GET', `/impediments?sprint=${sprint}`),
  crearImpedimento: (b) => pedir('POST', '/impediments', b),
  actualizarImpedimento: (id, b) => pedir('PUT', `/impediments/${id}`, b),

  /* --- Definition of Done --- */
  dod: (producto) => pedir('GET', `/dod?product=${producto}`),
  crearDod: (producto, texto) => pedir('POST', '/dod', { product_id: producto, texto }),
  dodDeHistoria: (itemId) => pedir('GET', `/dod/item/${itemId}`),
  marcarDod: (itemId, criterioId, cumplido) =>
    pedir('PUT', '/dod/check', { item_id: itemId, criterio_id: criterioId, cumplido }),

  /* --- Cierre del Sprint --- */
  incremento: (sprint) => pedir('GET', `/increment?sprint=${sprint}`),
  guardarIncremento: (b) => pedir('POST', '/increment', b),
  review: (sprint) => pedir('GET', `/review?sprint=${sprint}`),
  crearReview: (b) => pedir('POST', '/review', b),
  aceptarHistoria: (reviewId, b) => pedir('PUT', `/review/${reviewId}/item`, b),
  feedback: (reviewId, b) => pedir('POST', `/review/${reviewId}/feedback`, b),
  feedbackABacklog: (id) => pedir('POST', `/review/feedback/${id}/to-backlog`),
  retro: (sprint) => pedir('GET', `/retro?sprint=${sprint}`),
  crearRetro: (b) => pedir('POST', '/retro', b),
  notaRetro: (retroId, b) => pedir('POST', `/retro/${retroId}/notes`, b),
  votarNota: (id) => pedir('PUT', `/retro/notes/${id}/vote`),
  actualizarNota: (id, b) => pedir('PUT', `/retro/notes/${id}`, b),
  acciones: (producto) => pedir('GET', `/retro/acciones?product=${producto}`),

  /* --- Metricas --- */
  burndown: (sprint) => pedir('GET', `/metrics/burndown?sprint=${sprint}`),
  velocity: (producto) => pedir('GET', `/metrics/velocity?product=${producto}`),
  cumplimiento: (sprint) => pedir('GET', `/metrics/cumplimiento?sprint=${sprint}`),
  dashboard: (producto) => pedir('GET', `/metrics/dashboard?product=${producto}`)
};
