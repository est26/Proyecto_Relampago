import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Toast, Vacio } from '../components/UI.jsx';

export default function Daily() {
  const { producto, usuario } = useAuth();
  const [sprint, setSprint] = useState(null);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = async (sprintId) => {
    try { setDatos(await api.dailies(sprintId)); setError(null); }
    catch (e) { setError(e); } finally { setCargando(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const lista = await api.sprints(producto.id);
        const act = lista.find((s) => s.estado === 'activo');
        setSprint(act ?? null);
        if (act) await cargar(act.id); else setCargando(false);
      } catch (e) { setError(e); setCargando(false); }
    })();
  }, [producto?.id]);

  const hoy = new Date().toISOString().slice(0, 10);
  const mio = datos?.dailies.find(
    (d) => d.user_id === usuario.id && d.fecha?.slice(0, 10) === hoy
  );

  const enviar = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    setEnviando(true);
    try {
      const r = await api.guardarDaily({
        sprint_id: sprint.id,
        avance: f.get('avance'),
        siguiente: f.get('siguiente'),
        impedimento_txt: f.get('impedimento') || null,
        prioridad: f.get('prioridad') || 'media'
      });
      setAviso(r.impedimento_creado
        ? 'Daily guardado. Se creo un impedimento con seguimiento.'
        : 'Daily guardado');
      cargar(sprint.id);
    } catch (e2) { setError(e2); } finally { setEnviando(false); }
  };

  if (cargando) return <Cargando />;
  if (!sprint) return <Vacio titulo="No hay un Sprint activo" texto="El Daily Scrum pertenece a un Sprint en curso." />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Daily Scrum</h1>
        <p className="text-xs text-slate-500">Sprint {sprint.numero} · {hoy}</p>
      </div>

      <Aviso error={error} onCerrar={() => setError(null)} />

      <form onSubmit={enviar} className="tarjeta space-y-3 p-4">
        <p className="titulo-seccion">
          {mio ? 'Actualizar mi registro de hoy' : 'Mi actualizacion de hoy'}
        </p>

        <div>
          <label className="etiqueta">¿Que avance?</label>
          <textarea name="avance" rows="2" className="campo" defaultValue={mio?.avance ?? ''}
            placeholder="Termine el endpoint de capacidad" />
        </div>
        <div>
          <label className="etiqueta">¿Que hare ahora?</label>
          <textarea name="siguiente" rows="2" className="campo" defaultValue={mio?.siguiente ?? ''}
            placeholder="Conectar la barra de capacidad al Planning" />
        </div>
        <div>
          <label className="etiqueta">¿Existe algun impedimento?</label>
          <textarea name="impedimento" rows="2" className="campo" defaultValue={mio?.impedimento_txt ?? ''}
            placeholder="Dejar vacio si no hay ninguno" />
          <p className="mt-1 text-[11px] text-slate-500">
            Si escribe algo aqui, se crea automaticamente un impedimento con seguimiento propio.
          </p>
        </div>
        <div>
          <label className="etiqueta">Criticidad del impedimento</label>
          <select name="prioridad" className="campo" defaultValue="media">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Critica</option>
          </select>
        </div>

        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Guardando...' : mio ? 'Actualizar mi Daily' : 'Registrar mi Daily'}
        </button>
      </form>

      {/* HU-076 */}
      {datos?.sin_registrar_hoy?.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Sin registrar hoy</p>
          <p className="mt-0.5 text-xs">
            {datos.sin_registrar_hoy.map((u) => u.nombre).join(', ')}
          </p>
        </div>
      )}

      {/* HU-075 */}
      <section>
        <p className="titulo-seccion mb-2">Registros del equipo</p>
        {datos?.dailies.length === 0 ? (
          <Vacio titulo="Sin registros" texto="Nadie ha registrado su actualizacion todavia." />
        ) : (
          <ul className="space-y-2">
            {datos.dailies.map((d) => (
              <li key={d.id} className="tarjeta p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{d.autor}</p>
                  <span className="text-[11px] text-slate-400">{d.fecha?.slice(0, 10)}</span>
                </div>
                <dl className="mt-2 space-y-1.5 text-xs">
                  {d.avance && (
                    <div><dt className="font-semibold text-slate-500">Avance</dt>
                      <dd className="text-slate-700">{d.avance}</dd></div>
                  )}
                  {d.siguiente && (
                    <div><dt className="font-semibold text-slate-500">Siguiente</dt>
                      <dd className="text-slate-700">{d.siguiente}</dd></div>
                  )}
                  {d.impedimento_txt && (
                    <div className="rounded-lg bg-rose-50 p-2">
                      <dt className="font-semibold text-rose-700">Impedimento</dt>
                      <dd className="text-rose-900">{d.impedimento_txt}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
