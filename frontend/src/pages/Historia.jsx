import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Cargando, Aviso, Toast, Hoja, EstadoHistoria, Puntos, Barra, usePeticion
} from '../components/UI.jsx';

export default function Historia() {
  const { id } = useParams();
  const nav = useNavigate();
  const { esDev } = useAuth();
  const { datos, error, cargando, recargar } = usePeticion(() => api.historia(id), [id]);

  const [err, setErr] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [nuevaTarea, setNuevaTarea] = useState(false);

  if (cargando) return <Cargando />;
  if (error) return <Aviso error={error} />;

  const h = datos;
  const cumplidos = h.dod.filter((d) => d.cumplido).length;

  const marcar = async (criterioId, cumplido) => {
    try { await api.marcarDod(h.id, criterioId, cumplido); recargar(); }
    catch (e) { setErr(e); }
  };

  /* HU-086: si el DoD no esta completo, el servidor responde 422 */
  const cerrar = async () => {
    setErr(null);
    try {
      await api.cerrarHistoria(h.id);
      setAviso('Historia terminada');
      recargar();
    } catch (e) { setErr(e); }
  };

  const crearTarea = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.crearTarea({
        item_id: h.id,
        titulo: f.get('titulo'),
        horas_estimadas: Number(f.get('horas')) || 0
      });
      setNuevaTarea(false);
      recargar();
    } catch (e2) { setNuevaTarea(false); setErr(e2); }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="text-sm text-marca-600">← Volver</button>

      <section className="tarjeta p-4">
        <p className="text-[11px] font-semibold text-marca-600">
          {h.codigo} {h.epica && `· ${h.epica}`}
        </p>
        <h1 className="mt-1 text-lg font-bold leading-snug text-slate-800">{h.titulo}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <EstadoHistoria estado={h.estado} />
          <Puntos valor={h.story_points} />
        </div>

        {(h.como || h.quiero) && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            <span className="font-semibold">Como</span> {h.como},{' '}
            <span className="font-semibold">quiero</span> {h.quiero},{' '}
            <span className="font-semibold">para</span> {h.para}.
          </div>
        )}
      </section>

      {h.criterios_aceptacion && (
        <section className="tarjeta p-4">
          <p className="titulo-seccion mb-2">Criterios de aceptacion</p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
            {h.criterios_aceptacion}
          </pre>
        </section>
      )}

      {/* ---------- Definition of Done ---------- */}
      <section className="tarjeta p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="titulo-seccion">Definition of Done</p>
          <span className={`pastilla ${h.dod_completo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {cumplidos} de {h.dod.length}
          </span>
        </div>

        <Barra
          valor={cumplidos} max={h.dod.length}
          color={h.dod_completo ? 'bg-emerald-500' : 'bg-amber-500'}
        />

        <ul className="mt-3 space-y-1.5">
          {h.dod.map((d) => (
            <li key={d.id}>
              <label className={`flex items-start gap-2.5 rounded-lg p-2 ${esDev ? 'active:bg-slate-50' : ''}`}>
                <input
                  type="checkbox" checked={d.cumplido} disabled={!esDev}
                  onChange={(e) => marcar(d.id, e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-marca-600
                             focus:ring-marca-500 disabled:opacity-40"
                />
                <span className="min-w-0">
                  <span className={`block text-sm leading-snug ${d.cumplido ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                    {d.texto}
                  </span>
                  {d.verificado_por && (
                    <span className="text-[11px] text-slate-400">verificado por {d.verificado_por}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>

        {!esDev && (
          <p className="mt-2 text-[11px] text-slate-500">
            Solo los Developers validan su trabajo contra el Definition of Done.
          </p>
        )}

        {esDev && h.estado !== 'done' && (
          <button onClick={cerrar} className="btn-primario mt-3 w-full">
            Marcar historia como terminada
          </button>
        )}
      </section>

      <Aviso error={err} onCerrar={() => setErr(null)} />

      {/* ---------- Tareas ---------- */}
      <section className="tarjeta p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="titulo-seccion">Tareas ({h.tareas.length})</p>
          {esDev && (
            <button onClick={() => setNuevaTarea(true)} className="btn-secundario btn-chico">
              + Tarea
            </button>
          )}
        </div>

        {h.tareas.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            Sin tareas. Los Developers descomponen la historia.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {h.tareas.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${
                  t.estado === 'terminado' ? 'bg-emerald-500'
                    : t.estado === 'pendiente' ? 'bg-slate-300' : 'bg-amber-500'
                }`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-700">{t.titulo}</span>
                  <span className="text-[11px] text-slate-400">
                    {t.asignado_nombre ?? 'sin asumir'} · {t.estado}
                    {t.bloqueada && ' · 🔴 bloqueada'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hoja abierta={nuevaTarea} onCerrar={() => setNuevaTarea(false)} titulo="Nueva tarea tecnica">
        <form onSubmit={crearTarea} className="space-y-3">
          <div><label className="etiqueta">Titulo *</label>
            <input name="titulo" required className="campo" placeholder="Endpoint de filtrado" /></div>
          <div><label className="etiqueta">Horas estimadas</label>
            <input name="horas" type="number" step="0.5" min="0" className="campo" placeholder="4" /></div>
          <button className="btn-primario w-full">Crear tarea</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
