/**
 * Copia el build de Vite a public/, que es lo que Express sirve.
 * En Node puro para que funcione igual en Windows, macOS y Linux (Render).
 */
import fs from 'node:fs';
import path from 'node:path';

const origen = path.join(process.cwd(), 'frontend', 'dist');
const destino = path.join(process.cwd(), 'public');

if (!fs.existsSync(origen)) {
  console.error('No existe frontend/dist. Ejecute primero el build del frontend.');
  process.exit(1);
}

fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origen, destino, { recursive: true });

console.log(`Build copiado: ${path.relative(process.cwd(), origen)} -> public/`);
