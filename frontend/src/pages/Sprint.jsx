import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Hoja, Toast, Barra, Vacio, usePeticion } from '../components/UI.jsx';

const ESTADO = {
  activo:      { texto: 'Activo',      clase: 'bg-emerald-100 text-emerald-700' },
  planificado: { texto: 'Planificado', clase: 'bg-amber-100 text-amber-700' },
  cerrado:     { texto: 'Cerrado',     clase: 'bg-slate-100 text-slate-600' }
};

export default function Sprint() {
  const { producto, esSM } = useAuth();
  const { datos, error, cargando, recargar } = usePeticion(
    () => api.sprints(producto.id), [producto?.id]
  );
  const [nuevo, setNuevo] = useState(false);
  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);

  const crear = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.crearSprint({
        product_id: producto.id,
        sprint_goal: f.get('goal'),
        fecha_inicio: f.get('inicio'),
        fecha_fin: f.get('fin')
      });
      setNuevo(false);
      setAviso('Sprint creado. Los Developers deben armar el Sprint Backlog.');
      recargar();
    } catch (e2) { setNuevo(false); setErr(e2); }
  };

  const activar = async (id) => {
    try { await api.activarSprint(id); setAviso('Sprint iniciado'); recargar(); }
    catch (e) { setErr(e); }
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const enDosSemanas = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Sprints</h1>
          <p className="text-xs text-slate-500">Historial y planificacion</p>
        </div>
        {esSM && <button onClick={() => setNuevo(true)} className="btn-primario btn-chico">+ Sprint</button>}
      </div>

      {!esSM && (
        <p className="rounded-lg bg-slate-200/60 px-3 py-2 text-[11px] text-slate-600">
          El Scrum Master abre y cierra los Sprints como facilitador del proceso.
        </p>
      )}

      <Aviso error={error || err} onCerrar={() => setErr(null)} />

      {cargando ? <Cargando /> : datos?.length === 0 ? (
        <Vacio titulo="Aun no hay Sprints" texto="El Scrum Master debe crear el primero." />
      ) : (
        <ul className="space-y-3">
          {datos.map((s) => {
            const e = ESTADO[s.estado];
            return (
              <li key={s.id} className={`tarjeta p-4 ${s.estado === 'activo' ? 'border-l-4 border-l-emerald-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-800">Sprint {s.numero}</p>
                  <span className={`pastilla ${e.clase}`}>{e.texto}</span>
                </div>

                <p className="mt-1 text-sm leading-snug text-slate-600">{s.sprint_goal}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {s.fecha_inicio?.slice(0, 10)} → {s.fecha_fin?.slice(0, 10)} · {s.historias} historias
                </p>

                <div className="mt-2.5">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>{s.puntos_completados} de {s.puntos_comprometidos} SP</span>
                    <span>{s.puntos_comprometidos
                      ? Math.round((s.puntos_completados / s.puntos_comprometidos) * 100) : 0}%</span>
                  </div>
                  <Barra
                    valor={s.puntos_completados} max={s.puntos_comprometidos}
                    color={s.estado === 'cerrado' ? 'bg-slate-400' : 'bg-emerald-500'}
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <Link to={`/planning/${s.id}`} className="btn-secundario btn-chico flex-1">
                    {s.estado === 'cerrado' ? 'Ver detalle' : 'Sprint Planning'}
                  </Link>
                  {esSM && s.estado === 'planificado' && (
                    <button onClick={() => activar(s.id)} className="btn-primario btn-chico flex-1">
                      Iniciar Sprint
                    </button>
                  )}
                  {s.estado === 'activo' && (
                    <Link to="/cierre" className="btn-primario btn-chico flex-1">Cerrar Sprint</Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Hoja abierta={nuevo} onCerrar={() => setNuevo(false)} titulo="Nuevo Sprint">
        <form onSubmit={crear} className="space-y-3">
          <div>
            <label className="etiqueta">Sprint Goal *</label>
            <textarea name="goal" required rows="3" className="campo"
              placeholder="Que queremos lograr en este Sprint" />
            <p className="mt-1 text-[11px] text-slate-500">
              El Sprint Goal se acuerda entre todo el Scrum Team durante el Planning.
              Cualquier miembro puede ajustarlo despues.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="etiqueta">Inicio *</label>
              <input name="inicio" type="date" required defaultValue={hoy} className="campo" /></div>
            <div><label className="etiqueta">Fin *</label>
              <input name="fin" type="date" required defaultValue={enDosSemanas} className="campo" /></div>
          </div>
          <button className="btn-primario w-full">Crear Sprint</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
