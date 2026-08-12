import pg from 'pg';

const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres exige SSL. En local (docker/psql propio) se desactiva.
  ssl: isLocal ? false : { rejectUnauthorized: false },
  // El plan gratuito limita las conexiones simultaneas: no abrir de mas.
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (err) => console.error('[pg] error inesperado en el pool:', err.message));

/** Atajo para consultas sueltas. */
export const q = (text, params) => pool.query(text, params);

/**
 * Ejecuta varias consultas dentro de una transaccion.
 * Uso: await tx(async (c) => { await c.query(...); });
 */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Registra un cambio de estado en status_history.
 * De esta tabla salen el Burndown, el Cycle Time y la auditoria.
 * TODO endpoint que cambie un estado debe llamar a esto. Sin excepcion.
 */
export async function logStatus(
  { entidad, entidadId, sprintId = null, anterior = null, nuevo, storyPoints = 0, userId = null },
  client = pool
) {
  await client.query(
    `INSERT INTO status_history
       (entidad, entidad_id, sprint_id, estado_anterior, estado_nuevo, story_points, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entidad, entidadId, sprintId, anterior, nuevo, storyPoints, userId]
  );
}
