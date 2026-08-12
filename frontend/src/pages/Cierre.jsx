import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Toast, Vacio, Puntos, Hoja } from '../components/UI.jsx';

const PESTANAS = [
  { id: 'incremento', texto: 'Incremento' },
  { id: 'review', texto: 'Review' },
  { id: 'retro', texto: 'Retrospective' }
];

export default function Cierre() {
  const { producto, esPO, esSM, esDev } = useAuth();
  const nav = useNavigate();

  const [sprint, setSprint] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [pestana, setPestana] = useState('incremento');
  const [inc, setInc] = useState(null);
  const [rev, setRev] = useState(null);
  const [ret, setRet] = useState(null);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [notaNueva, setNotaNueva] = useState(null);

  const cargarTodo = async (sprintId) => {
    const [i, r, t] = await Promise.all([
      api.incremento(sprintId), api.review(sprintId), api.retro(sprintId)
    ]);
    setInc(i); setRev(r); setRet(t);
  };

  useEffect(() => {
    (async () => {
      try {
        const [lista, eq] = await Promise.all([api.sprints(producto.id), api.equipo(producto.id)]);
        setSprints(lista); setEquipo(eq);
        const act = lista.find((s) => s.estado === 'activo') ?? lista[0];
        setSprint(act ?? null);
        if (act) await cargarTodo(act.id);
      } catch (e) { setError(e); } finally { setCargando(false); }
    })();
  }, [producto?.id]);

  const cambiarSprint = async (id) => {
    const s = sprints.find((x) => x.id === Number(id));
    setSprint(s); setCargando(true);
    try { await cargarTodo(s.id); } catch (e) { setError(e); } finally { setCargando(false); }
  };

  const recargar = async () => { try { await cargarTodo(sprint.id); } catch (e) { setError(e); } };

  /* ---- acciones ---- */
  const guardarIncremento = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.guardarIncremento({
        sprint_id: sprint.id, descripcion: f.get('desc'), version: f.get('version')
      });
      setAviso('Incremento registrado'); recargar();
    } catch (e2) { setError(e2); }
  };

  const abrirReview = async () => {
    try { await api.crearReview({ sprint_id: sprint.id }); recargar(); }
    catch (e) { setError(e); }
  };

  const aceptar = async (itemId, aceptada) => {
    try { await api.aceptarHistoria(rev.review.id, { item_id: itemId, aceptada }); recargar(); }
    catch (e) { setError(e); }
  };

  const enviarFeedback = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.feedback(rev.review.id, { autor: f.get('autor'), texto: f.get('texto') });
      e.target.reset(); setAviso('Retroalimentacion registrada'); recargar();
    } catch (e2) { setError(e2); }
  };

  const aBacklog = async (fid) => {
    try { await api.feedbackABacklog(fid); setAviso('Convertido en historia del Product Backlog'); recargar(); }
    catch (e) { setError(e); }
  };

  const abrirRetro = async () => {
    try { await api.crearRetro({ sprint_id: sprint.id }); recargar(); }
    catch (e) { setError(e); }
  };

  const crearNota = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.notaRetro(ret.retro.id, {
        tipo: notaNueva,
        texto: f.get('texto'),
        responsable_id: Number(f.get('responsable')) || null
      });
      setNotaNueva(null); recargar();
    } catch (e2) { setNotaNueva(null); setError(e2); }
  };

  const votar = async (id) => { try { await api.votarNota(id); recargar(); } catch (e) { setError(e); } };

  const cerrarSprint = async () => {
    setError(null);
    try {
      const r = await api.cerrarSprint(sprint.id);
      setAviso(r.devueltas?.length
        ? `Sprint cerrado. ${r.devueltas.length} historia(s) regresaron al Product Backlog.`
        : 'Sprint cerrado');
      setTimeout(() => nav('/sprint'), 1400);
    } catch (e) { setError(e); }
  };

  if (cargando) return <Cargando />;
  if (!sprint) return <Vacio titulo="No hay Sprints" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Cierre del Sprint</h1>
        <select className="campo mt-2" value={sprint.id} onChange={(e) => cambiarSprint(e.target.value)}>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>Sprint {s.numero} · {s.estado}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-200 p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.id} onClick={() => setPestana(p.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              pestana === p.id ? 'bg-white text-marca-700 shadow-sm' : 'text-slate-500'
            }`}
          >{p.texto}</button>
        ))}
      </div>

      <Aviso error={error} onCerrar={() => setError(null)} />

      {/* ---------------- INCREMENTO ---------------- */}
      {pestana === 'incremento' && inc && (
        <div className="space-y-3">
          <section className="tarjeta p-4">
            <p className="titulo-seccion">Sprint Goal</p>
            <p className="mt-1 text-sm text-slate-700">{inc.sprint.sprint_goal}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-2xl font-bold text-emerald-700">{inc.puntos_entregados}</p>
                <p className="text-[11px] text-emerald-800">SP entregados</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-2xl font-bold text-slate-600">{inc.puntos_no_entregados}</p>
                <p className="text-[11px] text-slate-600">SP no entregados</p>
              </div>
            </div>
          </section>

          <section className="tarjeta p-4">
            <p className="titulo-seccion mb-2">Historias que forman el Incremento</p>
            {inc.historias.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-400">Ninguna historia terminada aun.</p>
            ) : (
              <ul className="space-y-1.5">
                {inc.historias.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5">
                    <span className="text-emerald-600">✓</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{h.titulo}</span>
                    <Puntos valor={h.story_points} />
                  </li>
                ))}
              </ul>
            )}

            {inc.no_terminadas.length > 0 && (
              <>
                <p className="titulo-seccion mb-2 mt-4">No terminadas (regresan al Product Backlog)</p>
                <ul className="space-y-1.5">
                  {inc.no_terminadas.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 rounded-lg bg-slate-100 p-2.5">
                      <span className="text-slate-400">○</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{h.titulo}</span>
                      <Puntos valor={h.story_points} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {esDev && (
            <form onSubmit={guardarIncremento} className="tarjeta space-y-3 p-4">
              <p className="titulo-seccion">Documentar el Incremento</p>
              <textarea name="desc" rows="3" className="campo" defaultValue={inc.incremento?.descripcion ?? ''}
                placeholder="Que quedo utilizable al final del Sprint" />
              <input name="version" className="campo" defaultValue={inc.incremento?.version ?? ''}
                placeholder="v0.2.0" />
              <button className="btn-primario w-full">Guardar Incremento</button>
            </form>
          )}
        </div>
      )}

      {/* ---------------- REVIEW ---------------- */}
      {pestana === 'review' && rev && (
        <div className="space-y-3">
          {!rev.review ? (
            <Vacio
              titulo="Sprint Review no iniciado"
              texto={esSM ? 'Como Scrum Master, puede convocarlo.' : 'El Scrum Master debe convocarlo.'}
              accion={esSM && <button onClick={abrirReview} className="btn-primario">Iniciar Sprint Review</button>}
            />
          ) : (
            <>
              <section className="tarjeta p-4">
                <div className="flex items-center justify-between">
                  <p className="titulo-seccion">Aceptacion del Product Owner</p>
                  <span className="pastilla bg-slate-100 text-slate-600">
                    {rev.aceptadas} de {rev.total}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {rev.items.map((i) => (
                    <li key={i.id} className="rounded-lg border border-slate-200 p-2.5">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-800">{i.titulo}</span>
                          <span className="text-[11px] text-slate-400">
                            {i.estado === 'done' ? 'terminada' : 'no terminada'} · {i.story_points} SP
                          </span>
                        </span>
                        {i.aceptada
                          ? <span className="pastilla bg-emerald-100 text-emerald-700">aceptada</span>
                          : <span className="pastilla bg-slate-100 text-slate-500">pendiente</span>}
                      </div>
                      {i.comentario && (
                        <p className="mt-1.5 text-xs italic text-slate-600">"{i.comentario}"</p>
                      )}
                      {esPO && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => aceptar(i.id, true)} className="btn-secundario btn-chico flex-1">
                            Aceptar
                          </button>
                          <button onClick={() => aceptar(i.id, false)} className="btn-secundario btn-chico flex-1">
                            Rechazar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {!esPO && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Solo el Product Owner acepta o rechaza el trabajo presentado.
                  </p>
                )}
              </section>

              <section className="tarjeta p-4">
                <p className="titulo-seccion mb-2">Retroalimentacion</p>
                <ul className="space-y-2">
                  {rev.feedback.map((f) => (
                    <li key={f.id} className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-sm text-slate-700">{f.texto}</p>
                      <p className="mt-1 text-[11px] text-slate-400">— {f.autor}</p>
                      {f.item_generado_id ? (
                        <p className="mt-1 text-[11px] font-medium text-emerald-700">
                          → convertido en {f.item_generado_codigo ?? 'historia'}
                        </p>
                      ) : esPO && (
                        <button onClick={() => aBacklog(f.id)} className="btn-secundario btn-chico mt-2">
                          Convertir en historia
                        </button>
                      )}
                    </li>
                  ))}
                  {rev.feedback.length === 0 && (
                    <p className="py-2 text-center text-sm text-slate-400">Sin retroalimentacion.</p>
                  )}
                </ul>

                <form onSubmit={enviarFeedback} className="mt-3 space-y-2">
                  <input name="autor" className="campo" placeholder="Autor (stakeholder, profesor...)" />
                  <textarea name="texto" required rows="2" className="campo" placeholder="Observacion" />
                  <button className="btn-secundario w-full">Agregar retroalimentacion</button>
                </form>
              </section>
            </>
          )}
        </div>
      )}

      {/* ---------------- RETROSPECTIVE ---------------- */}
      {pestana === 'retro' && ret && (
        <div className="space-y-3">
          {!ret.retro ? (
            <Vacio
              titulo="Retrospectiva no iniciada"
              texto={esSM ? 'Como Scrum Master, puede facilitarla.' : 'El Scrum Master debe iniciarla.'}
              accion={esSM && <button onClick={abrirRetro} className="btn-primario">Iniciar Retrospectiva</button>}
            />
          ) : (
            <>
              {[
                { tipo: 'bien', titulo: '✅ Que funciono bien', lista: ret.bien, fondo: 'bg-emerald-50' },
                { tipo: 'mejorar', titulo: '⚠️ Que debemos mejorar', lista: ret.mejorar, fondo: 'bg-amber-50' },
                { tipo: 'accion', titulo: '🎯 Acciones de mejora', lista: ret.acciones, fondo: 'bg-marca-50' }
              ].map((bloque) => (
                <section key={bloque.tipo} className="tarjeta p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="titulo-seccion">{bloque.titulo}</p>
                    <button onClick={() => setNotaNueva(bloque.tipo)} className="btn-secundario btn-chico">+</button>
                  </div>
                  <ul className="space-y-2">
                    {bloque.lista.map((n) => (
                      <li key={n.id} className={`rounded-lg p-2.5 ${bloque.fondo}`}>
                        <p className="text-sm text-slate-800">{n.texto}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">— {n.autor}</span>
                          {n.responsable && (
                            <span className="pastilla bg-white text-slate-700">
                              responsable: {n.responsable}
                            </span>
                          )}
                          {bloque.tipo === 'accion' && (
                            <span className={`pastilla ${
                              n.estado === 'hecha' ? 'bg-emerald-200 text-emerald-800'
                                : n.estado === 'en_curso' ? 'bg-amber-200 text-amber-800'
                                : 'bg-slate-200 text-slate-700'}`}>{n.estado}</span>
                          )}
                          <button onClick={() => votar(n.id)}
                                  className="pastilla bg-white text-slate-600">👍 {n.votos}</button>
                        </div>
                      </li>
                    ))}
                    {bloque.lista.length === 0 && (
                      <p className="py-2 text-center text-sm text-slate-400">Sin registros.</p>
                    )}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {/* ---------------- Cerrar ---------------- */}
      {sprint.estado === 'activo' && (
        <section className="tarjeta border-2 border-dashed border-slate-300 p-4">
          <p className="titulo-seccion mb-1">Cerrar el Sprint</p>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            No se puede cerrar sin Sprint Review y Retrospective registrados. Las historias no
            terminadas regresan al Product Backlog.
          </p>
          {esSM ? (
            <button onClick={cerrarSprint} className="btn-peligro w-full">Cerrar Sprint {sprint.numero}</button>
          ) : (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
              El cierre formal lo realiza el Scrum Master.
            </p>
          )}
        </section>
      )}

      <Hoja abierta={!!notaNueva} onCerrar={() => setNotaNueva(null)}
            titulo={notaNueva === 'accion' ? 'Nueva accion de mejora' : 'Nueva nota'}>
        <form onSubmit={crearNota} className="space-y-3">
          <textarea name="texto" required rows="3" className="campo" />
          {notaNueva === 'accion' && (
            <div>
              <label className="etiqueta">Responsable *</label>
              <select name="responsable" required className="campo" defaultValue="">
                <option value="" disabled>Seleccione</option>
                {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.rol})</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Sin responsable no hay seguimiento posible en la siguiente retrospectiva.
              </p>
            </div>
          )}
          <button className="btn-primario w-full">Agregar</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
