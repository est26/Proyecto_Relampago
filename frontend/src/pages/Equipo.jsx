import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Toast, Rol, Hoja } from '../components/UI.jsx';

/* Matriz de responsabilidades: es la evidencia visual del criterio 1 */
const MATRIZ = [
  ['Definir el Product Goal',            'PO'],
  ['Crear y editar historias',           'PO'],
  ['Ordenar el Product Backlog',         'PO'],
  ['Aceptar el trabajo en el Review',    'PO'],
  ['Abrir y cerrar el Sprint',           'SM'],
  ['Gestionar y escalar impedimentos',   'SM'],
  ['Estimar en Story Points',            'DEV'],
  ['Conformar el Sprint Backlog',        'DEV'],
  ['Crear tareas y asumirlas',           'DEV'],
  ['Mover el trabajo en el tablero',     'DEV'],
  ['Validar contra el Definition of Done','DEV'],
  ['Definir el Sprint Goal',             'TODOS'],
  ['Definir el Definition of Done',      'TODOS'],
  ['Reportar un impedimento',            'TODOS']
];
/* colores */
const COLOR = {
  PO: 'bg-violet-100 text-violet-700',
  SM: 'bg-sky-100 text-sky-700',
  DEV: 'bg-emerald-100 text-emerald-700',
  TODOS: 'bg-slate-200 text-slate-700'
};
/* Funcion */
export default function Equipo() {
  const { producto, usuario, rol, recargar: recargarAuth } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [nuevoDod, setNuevoDod] = useState(false);
  const [capacidad, setCapacidad] = useState(false);

  const cargar = async () => {
    try { setDatos(await api.producto(producto.id)); setError(null); }
    catch (e) { setError(e); } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [producto?.id]);

  const guardarCapacidad = async (e) => {
    e.preventDefault();
    try {
      await api.miCapacidad(producto.id, Number(new FormData(e.target).get('horas')));
      setCapacidad(false); setAviso('Capacidad actualizada'); cargar();
    } catch (e2) { setCapacidad(false); setError(e2); }
  };

  const agregarDod = async (e) => {
    e.preventDefault();
    try {
      await api.crearDod(producto.id, new FormData(e.target).get('texto'));
      setNuevoDod(false); setAviso('Criterio agregado al Definition of Done'); cargar();
    } catch (e2) { setNuevoDod(false); setError(e2); }
  };

  if (cargando) return <Cargando />;
  if (error && !datos) return <Aviso error={error} />;

  const yo = datos.equipo.find((m) => m.id === usuario.id);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-800">Equipo y Definition of Done</h1>

      <Aviso error={error} onCerrar={() => setError(null)} />

      <section className="tarjeta border-l-4 border-l-violet-500 p-4">
        <p className="titulo-seccion">Product Goal</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{datos.product_goal}</p>
        {datos.vision && (
          <>
            <p className="titulo-seccion mt-3">Vision</p>
            <p className="mt-1 text-sm text-slate-600">{datos.vision}</p>
          </>
        )}
      </section>

      {/* Equipo y capacidad */}
      <section className="tarjeta p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="titulo-seccion">Scrum Team</p>
          <span className="pastilla bg-slate-100 text-slate-600">
            capacidad {datos.capacidad_equipo} h
          </span>
        </div>
        <ul className="space-y-2">
          {datos.equipo.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                               bg-slate-200 text-sm font-bold text-slate-600">
                {m.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {m.nombre}{m.id === usuario.id && ' (usted)'}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{m.especialidad}</span>
              </span>
              <span className="shrink-0 text-right">
                <Rol rol={m.rol} corto />
                {m.rol === 'DEV' && (
                  <span className="mt-1 block text-[11px] text-slate-500">{m.capacidad_horas} h</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {yo?.rol === 'DEV' && (
          <button onClick={() => setCapacidad(true)} className="btn-secundario mt-3 w-full">
            Ajustar mi capacidad para el Sprint
          </button>
        )}
      </section>

      {/* Definition of Done */}
      <section className="tarjeta p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="titulo-seccion">Definition of Done</p>
          <button onClick={() => setNuevoDod(true)} className="btn-secundario btn-chico">+ Criterio</button>
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Lo define todo el Scrum Team. Ninguna historia se cierra sin cumplirlo por completo.
        </p>
        <ul className="space-y-1.5">
          {datos.dod.map((d) => (
            <li key={d.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">
              <span className="text-slate-400">☑</span>{d.texto}
            </li>
          ))}
        </ul>
      </section>

      {/* Matriz de responsabilidades */}
      <section className="tarjeta p-4">
        <p className="titulo-seccion mb-1">Responsabilidades segun Scrum</p>
        <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
          Estas reglas estan aplicadas en el servidor, no solo en la interfaz.
          Su rol actual es <strong>{rol}</strong>: las filas de otro color le devolveran un aviso.
        </p>
        <ul className="divide-y divide-slate-100">
          {MATRIZ.map(([accion, quien]) => (
            <li key={accion} className="flex items-center justify-between gap-2 py-2">
              <span className={`text-xs ${quien === rol || quien === 'TODOS' ? 'text-slate-800' : 'text-slate-400'}`}>
                {accion}
              </span>
              <span className={`pastilla shrink-0 ${COLOR[quien]}`}>
                {quien === 'TODOS' ? 'Scrum Team' : quien}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Hoja abierta={capacidad} onCerrar={() => setCapacidad(false)} titulo="Mi capacidad">
        <form onSubmit={guardarCapacidad} className="space-y-3">
          <div>
            <label className="etiqueta">Horas disponibles para este Sprint</label>
            <input name="horas" type="number" min="0" max="200" className="campo"
                   defaultValue={yo?.capacidad_horas ?? 0} />
            <p className="mt-1 text-[11px] text-slate-500">
              Se suma a la capacidad del equipo que se ve en el Sprint Planning.
            </p>
          </div>
          <button className="btn-primario w-full">Guardar</button>
        </form>
      </Hoja>

      <Hoja abierta={nuevoDod} onCerrar={() => setNuevoDod(false)} titulo="Nuevo criterio de DoD">
        <form onSubmit={agregarDod} className="space-y-3">
          <textarea name="texto" required rows="2" className="campo"
                    placeholder="Pruebas unitarias superadas" />
          <button className="btn-primario w-full">Agregar</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => { setAviso(null); recargarAuth(); }} />
    </div>
  );
}
