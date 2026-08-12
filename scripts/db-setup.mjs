/**
 * Carga el esquema y los datos de prueba en PostgreSQL.
 *
 * No necesita psql instalado: usa la libreria pg que ya trae el proyecto.
 * Pensado para Windows, donde instalar el cliente de PostgreSQL es un
 * tramite innecesario.
 *
 *   npm run db:setup     -> schema.sql + seed.sql  (borra y recrea todo)
 *   npm run db:seed      -> solo seed.sql          (recarga datos de prueba)
 *
 * Requiere DATABASE_URL. En local debe ser la EXTERNAL Database URL de Render.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const soloSeed = process.argv.includes('seed');
const archivos = soloSeed ? ['seed.sql'] : ['schema.sql', 'seed.sql'];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('\n  Falta DATABASE_URL.\n');
  console.error('  1. Copie .env.example a .env');
  console.error('  2. Pegue la EXTERNAL Database URL que da Render');
  console.error('  3. Vuelva a ejecutar este comando\n');
  process.exit(1);
}

const esLocal = /localhost|127\.0\.0\.1/.test(url);
const cliente = new pg.Client({
  connectionString: url,
  ssl: esLocal ? false : { rejectUnauthorized: false }
});

try {
  await cliente.connect();
  console.log(`\n  Conectado a ${url.replace(/:[^:@]+@/, ':****@')}\n`);
} catch (err) {
  console.error('\n  No se pudo conectar a la base de datos.');
  console.error('  ' + err.message);
  console.error('\n  Revise que sea la URL EXTERNA (no la interna de Render)\n');
  process.exit(1);
}

for (const nombre of archivos) {
  const ruta = path.join(process.cwd(), 'database', nombre);
  process.stdout.write(`  Ejecutando ${nombre} ... `);
  try {
    await cliente.query(fs.readFileSync(ruta, 'utf8'));
    console.log('listo');
  } catch (err) {
    console.log('FALLO');
    console.error('\n  ' + err.message + '\n');
    await cliente.end();
    process.exit(1);
  }
}

const { rows } = await cliente.query(`
  SELECT
    (SELECT COUNT(*) FROM users)::int          AS usuarios,
    (SELECT COUNT(*) FROM backlog_items)::int  AS historias,
    (SELECT COUNT(*) FROM sprints)::int        AS sprints,
    (SELECT COUNT(*) FROM tasks)::int          AS tareas,
    (SELECT COUNT(*) FROM status_history)::int AS historial
`);
const d = rows[0];

console.log('\n  Base lista:');
console.log(`    ${d.usuarios} usuarios · ${d.historias} historias · ${d.sprints} sprints`);
console.log(`    ${d.tareas} tareas · ${d.historial} cambios de estado (base del burndown)`);
console.log('\n  Ingrese con cualquiera de estos correos y la clave demo1234:');
console.log('    ana@sprintcuc.cr    Product Owner');
console.log('    marco@sprintcuc.cr  Scrum Master');
console.log('    jose@sprintcuc.cr   Developer');
console.log('    lucia@sprintcuc.cr  Developer\n');

await cliente.end();
