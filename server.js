import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';

import { q } from './db.js';

import auth from './routes/auth.js';
import products from './routes/products.js';
import backlog from './routes/backlog.js';
import sprints from './routes/sprints.js';
import tasks from './routes/tasks.js';
import dailies from './routes/dailies.js';
import impediments from './routes/impediments.js';
import dod from './routes/dod.js';
import increment from './routes/increment.js';
import review from './routes/review.js';
import retro from './routes/retro.js';
import metrics from './routes/metrics.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* ------------------------------------------------------------
   Health check.
   Render lo usa como healthCheckPath y el pinger externo lo
   golpea cada 10 minutos para que el servicio no se duerma.
   ------------------------------------------------------------ */
app.get('/api/ping', async (_req, res) => {
  try {
    const { rows } = await q('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok, hora: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'Base de datos no disponible', detalle: err.message });
  }
});

/* ---------------------------- API ---------------------------- */
app.use('/api/auth', auth);
app.use('/api/products', products);
app.use('/api/backlog', backlog);
app.use('/api/sprints', sprints);
app.use('/api/tasks', tasks);
app.use('/api/dailies', dailies);
app.use('/api/impediments', impediments);
app.use('/api/dod', dod);
app.use('/api/increment', increment);
app.use('/api/review', review);
app.use('/api/retro', retro);
app.use('/api/metrics', metrics);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }));

/* ------------------- Frontend (build de Vite) ------------------- */
const PUBLIC_DIR = path.join(process.cwd(), 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.type('text/plain').send(
      'SprintCUC API en linea.\n' +
      'El frontend todavia no esta construido (falta la carpeta public/).\n' +
      'Prueba GET /api/ping'
    )
  );
}

/* ------------------ Manejo central de errores ------------------ */
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe', detalle: err.detail });
  }
  if (err?.code === '23503') {
    return res.status(400).json({ error: 'Referencia invalida', detalle: err.detail });
  }
  if (err?.code === '23514') {
    return res.status(400).json({ error: 'Valor no permitido para ese campo', detalle: err.detail });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SprintCUC escuchando en el puerto ${PORT}`));
