import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Toast, Barra, Hoja, Puntos, EstadoHistoria } from '../components/UI.jsx';

export default function Planning() {
  const { id } = useParams();
  const nav = useNavigate();
  const { producto, esDev } = useAuth();

  const [sprint, setSprint] = useState(null);
  const [capacidad, setCapacidad] = useState(null);
  const [disponibles, setDisponibles] = useState([]);
  const [velocity, setVelocity] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [editandoGoal, setEditandoGoal] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [s, c, b, v] = await Promise.all([
        api.sprint(id),
        api.capacidad(id),
        api.backlog(producto.id, { estado: 'backlog', sin_sprint: 'true' }),
        api.velocity(producto.id)
      ]);
      setSprint(s); setCapacidad(c); setDisponibles(b); setVelocity(v);
      setError(null);
    } catch (e) { setError(e); } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [id]);

  if (cargando) return <Cargando />;
  if (error && !sprint) return <Aviso error={error} />;

  const comprometidos = sprint.puntos_comprometidos;
  const seleccionados = disponibles
    .filter((i) => seleccion.includes(i.id))
    .reduce((a, i) => a + (i.story_points || 0), 0);

  const alternar = (itemId) =>
    setSeleccion((s) => (s.includes(itemId) ? s.filter((x) => x !== itemId) : [...s, itemId]));

  /* HU-058/061: solo los Developers conforman el Sprint Backlog */
  const comprometer = async () => {
    setError(null);
    try {
      await api.comprometer(id, seleccion);
      setSeleccion([]);
      setAviso('Historias agregadas al Sprint Backlog');
      cargar();
    } catch (e) { setError(e); }
  };

  const sacar = async (itemId) => {
    try { await api.descomprometer(id, itemId); cargar(); }
    catch (e) { setError(e); }
  };

  const guardarGoal = async (e) => {
    e.preventDefault();
    try {
      await api.sprintGoal(id, new FormData(e.target).get('goal'));
      setEditandoGoal(false);
      setAviso('Sprint Goal actualizado');
      cargar();
    } catch (e2) { setEditandoGoal(false); setError(e2); }
  };

  const abierto = sprint.estado !== 'cerrado';
  const excede = capacidad && seleccionados + comprometidos > (velocity?.velocidad_promedio || Infinity) * 1.25;

  return (
    <div className="space-y-4">
      <button onClick={() => nav('/sprint')} className="text-sm text-marca-600">← Sprints</button>

      {/* Sprint Goal */}
      <section className="tarjeta border-l-4 border-l-marca-600 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="titulo-seccion">Sprint {sprint.numero} · Sprint Goal</p>
          {abierto && (
            <button onClick={() => setEditandoGoal(true)} className="text-xs text-marca-600">editar</button>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{sprint.sprint_goal}</p>
        <p className="mt-2 text-[11px] text-slate-400">
          {sprint.fecha_inicio?.slice(0, 10)} → {sprint.fecha_fin?.slice(0, 10)}
          {abierto && ` · ${sprint.dias_restantes} dias restantes`}
        </p>
      </section>

      {/* HU-011/057: capacidad del equipo */}
      <section className="tarjeta p-4">
        <p className="titulo-seccion mb-3">Capacidad del equipo</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-slate-800">{capacidad.capacidad_total} h</p>
            <p className="text-[11px] text-slate-500">disponibles</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{capacidad.horas_comprometidas} h</p>
            <p className="text-[11px] text-slate-500">comprometidas</p>
          </div>
          <div>
            <p className="text-xl font-bold text-marca-700">{comprometidos} SP</p>
            <p className="text-[11px] text-slate-500">en el Sprint</p>
          </div>
        </div>

        <div className="mt-3">
          <Barra
            valor={capacidad.horas_comprometidas} max={capacidad.capacidad_total}
            color={capacidad.horas_comprometidas > capacidad.capacidad_total ? 'bg-rose-500' : 'bg-emerald-500'}
            alto="h-2.5"
          />
        </div>

        <ul className="mt-3 space-y-1">
          {capacidad.developers.map((d) => (
            <li key={d.id} className="flex justify-between text-xs text-slate-600">
              <span>{d.nombre}</span>
              <span className="font-semibold">{d.capacidad_horas} h</span>
            </li>
          ))}
        </ul>

        {/* HU-060 */}
        {velocity?.velocidad_promedio > 0 && (
          <p className="mt-3 rounded-lg bg-marca-50 px-3 py-2 text-[11px] leading-relaxed text-marca-900">
            📊 {velocity.recomendacion}
          </p>
        )}
      </section>

      <Aviso error={error} onCerrar={() => setError(null)} />

      {/* Sprint Backlog */}
      <section className="tarjeta p-4">
        <p className="titulo-seccion mb-2">Sprint Backlog ({sprint.items.length})</p>
        {sprint.items.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">
            Vacio. Los Developers seleccionan el trabajo abajo.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sprint.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                <Link to={`/historia/${i.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">{i.titulo}</span>
                  <span className="mt-1 flex gap-1.5">
                    <EstadoHistoria estado={i.estado} />
                    <Puntos valor={i.puntos_comprometidos} />
                  </span>
                </Link>
                {esDev && abierto && i.estado !== 'done' && (
                  <button onClick={() => sacar(i.id)}
                    className="shrink-0 px-2 text-xs text-rose-500">sacar</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Seleccion desde el Product Backlog */}
      {abierto && (
        <section className="tarjeta p-4">
          <p className="titulo-seccion mb-1">Product Backlog disponible</p>
          <p className="mb-3 text-[11px] text-slate-500">
            {esDev
              ? 'Seleccione lo que el equipo cree poder completar. Solo los Developers deciden.'
              : 'Solo los Developers seleccionan el trabajo del Sprint.'}
          </p>

          {disponibles.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">No queda nada disponible.</p>
          ) : (
            <ul className="space-y-1.5">
              {disponibles.map((i) => {
                const marcada = seleccion.includes(i.id);
                return (
                  <li key={i.id}>
                    <button
                      disabled={!esDev}
                      onClick={() => alternar(i.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                        marcada ? 'border-marca-500 bg-marca-50' : 'border-slate-200'
                      } disabled:opacity-60`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] ${
                        marcada ? 'border-marca-600 bg-marca-600 text-white' : 'border-slate-300'
                      }`}>{marcada ? '✓' : ''}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{i.titulo}</span>
                        <span className="text-[11px] text-slate-400">#{i.prioridad_orden} · {i.codigo}</span>
                      </span>
                      <Puntos valor={i.story_points} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {esDev && seleccion.length > 0 && (
            <div className="sticky bottom-24 mt-4 rounded-xl bg-slate-900 p-3 text-white shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <span>{seleccion.length} historias · {seleccionados} SP</span>
                <span className="text-xs text-slate-300">total: {comprometidos + seleccionados} SP</span>
              </div>
              {excede && (
                <p className="mt-1.5 text-[11px] text-amber-300">
                  ⚠ Supera en mas de 25% su velocidad promedio ({velocity.velocidad_promedio} SP).
                </p>
              )}
              <button onClick={comprometer} className="btn-primario mt-2 w-full">
                Comprometer en el Sprint Backlog
              </button>
            </div>
          )}
        </section>
      )}

      <Hoja abierta={editandoGoal} onCerrar={() => setEditandoGoal(false)} titulo="Sprint Goal">
        <form onSubmit={guardarGoal} className="space-y-3">
          <textarea name="goal" rows="4" className="campo" defaultValue={sprint.sprint_goal} required />
          <p className="text-[11px] text-slate-500">
            El Sprint Goal es un compromiso de todo el Scrum Team: los tres roles pueden ajustarlo.
          </p>
          <button className="btn-primario w-full">Guardar</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
