import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors, pointerWithin
} from '@dnd-kit/core';

import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Hoja, Toast, Vacio } from '../components/UI.jsx';

const COLUMNAS = [
  { id: 'pendiente', texto: 'Pendiente', color: 'bg-slate-400' },
  { id: 'progreso',  texto: 'En progreso', color: 'bg-amber-500' },
  { id: 'revision',  texto: 'En revision', color: 'bg-violet-500' },
  { id: 'pruebas',   texto: 'Pruebas',     color: 'bg-sky-500' },
  { id: 'terminado', texto: 'Terminado',   color: 'bg-emerald-500' }
];

/* ---------------- Tarjeta ---------------- */
function Tarjeta({ tarea, puedeMover, onTocar, arrastrando }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: tarea.id, disabled: !puedeMover
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 20 } : undefined}
      className={`tarjeta p-2.5 ${puedeMover ? 'sin-scroll-touch' : ''} ${arrastrando ? 'opacity-30' : ''}
                  ${tarea.bloqueada ? 'border-l-4 border-l-rose-500' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => onTocar(tarea)}
    >
      <p className="text-[10px] font-semibold text-marca-600">{tarea.historia_codigo}</p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-slate-800">{tarea.titulo}</p>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-slate-500">
          {tarea.asignado_nombre ?? 'sin asumir'}
        </span>
        {tarea.bloqueada && <span className="text-[10px]">🔴</span>}
        {tarea.horas_estimadas > 0 && (
          <span className="shrink-0 text-[10px] text-slate-400">{tarea.horas_estimadas}h</span>
        )}
      </div>
    </div>
  );
}

/* ---------------- Columna ---------------- */
function Columna({ col, tareas, puedeMover, onTocar, activa }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="w-[76vw] max-w-[280px] shrink-0 snap-start">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${col.color}`} />
        <p className="text-xs font-bold text-slate-700">{col.texto}</p>
        <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600">
          {tareas.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[120px] space-y-2 rounded-xl p-2 transition ${
          isOver ? 'bg-marca-100 ring-2 ring-marca-400' : 'bg-slate-200/50'
        }`}
      >
        {tareas.map((t) => (
          <Tarjeta key={t.id} tarea={t} puedeMover={puedeMover} onTocar={onTocar}
                   arrastrando={activa === t.id} />
        ))}
        {tareas.length === 0 && (
          <p className="py-6 text-center text-[11px] text-slate-400">vacio</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Pantalla ---------------- */
export default function Tablero() {
  const { producto, esDev, usuario } = useAuth();
  const [sprint, setSprint] = useState(null);
  const [columnas, setColumnas] = useState(null);
  const [meta, setMeta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [activa, setActiva] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const arrastrandoRef = useRef(false);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const cargarTablero = useCallback(async (sprintId, silencioso = false) => {
    if (arrastrandoRef.current) return;          // no pisar el arrastre en curso
    if (!silencioso) setCargando(true);
    try {
      const t = await api.tablero(sprintId);
      setColumnas(t.columnas);
      setMeta({ total: t.total, bloqueadas: t.bloqueadas, actualizado: t.actualizado });
    } catch (e) { if (!silencioso) setError(e); }
    finally { if (!silencioso) setCargando(false); }
  }, []);

  /* Sprint activo */
  useEffect(() => {
    (async () => {
      try {
        const lista = await api.sprints(producto.id);
        const act = lista.find((s) => s.estado === 'activo');
        setSprint(act ?? null);
        if (act) await cargarTablero(act.id);
        else setCargando(false);
      } catch (e) { setError(e); setCargando(false); }
    })();
  }, [producto?.id, cargarTablero]);

  /* HU-070: actualizacion inmediata. Consulta cada 8 s.
     Es lo que sustituye a los WebSockets sin pagar su complejidad. */
  useEffect(() => {
    if (!sprint) return;
    const t = setInterval(() => cargarTablero(sprint.id, true), 8000);
    return () => clearInterval(t);
  }, [sprint, cargarTablero]);

  const mover = async (tareaId, estado) => {
    // optimista: la tarjeta se mueve de inmediato
    const antes = columnas;
    setColumnas((c) => {
      const copia = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [...v]]));
      let tarea = null;
      for (const k of Object.keys(copia)) {
        const i = copia[k].findIndex((t) => t.id === tareaId);
        if (i > -1) { tarea = copia[k].splice(i, 1)[0]; break; }
      }
      if (tarea) copia[estado].push({ ...tarea, estado });
      return copia;
    });

    try {
      await api.moverTarea(tareaId, estado);
      if (sprint) cargarTablero(sprint.id, true);
    } catch (e) { setColumnas(antes); setError(e); }
  };

  const alSoltar = ({ active, over }) => {
    arrastrandoRef.current = false;
    setActiva(null);
    if (!over) return;
    const destino = over.id;
    const origen = Object.entries(columnas).find(([, v]) => v.some((t) => t.id === active.id))?.[0];
    if (!destino || destino === origen) return;
    mover(active.id, destino);
  };

  const asumir = async (tareaId) => {
    try {
      await api.asumirTarea(tareaId);
      setDetalle(null);
      setAviso('Tarea asumida');
      if (sprint) cargarTablero(sprint.id, true);
    } catch (e) { setDetalle(null); setError(e); }
  };

  const bloquear = async (tarea) => {
    try {
      await api.bloquearTarea(tarea.id, !tarea.bloqueada);
      setDetalle(null);
      setAviso(tarea.bloqueada ? 'Bloqueo retirado' : 'Tarea marcada como bloqueada');
      if (sprint) cargarTablero(sprint.id, true);
    } catch (e) { setDetalle(null); setError(e); }
  };

  if (cargando) return <Cargando texto="Cargando el tablero..." />;
  if (!sprint) return <Vacio titulo="No hay un Sprint activo" texto="El tablero muestra el trabajo del Sprint en curso." />;

  const tareaActiva = activa
    ? Object.values(columnas ?? {}).flat().find((t) => t.id === activa)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-800">Tablero</h1>
          <p className="truncate text-xs text-slate-500">Sprint {sprint.numero} · {meta?.total ?? 0} tareas</p>
        </div>
        <div className="shrink-0 text-right">
          {meta?.bloqueadas > 0 && (
            <span className="pastilla bg-rose-100 text-rose-700">🔴 {meta.bloqueadas} bloqueadas</span>
          )}
          <p className="mt-1 text-[10px] text-slate-400">actualiza cada 8 s</p>
        </div>
      </div>

      <Aviso error={error} onCerrar={() => setError(null)} />

      {!esDev && (
        <p className="rounded-lg bg-slate-200/60 px-3 py-2 text-[11px] text-slate-600">
          Solo los Developers mueven el trabajo del Sprint. El Scrum Master facilita, no asigna tareas.
        </p>
      )}

      <DndContext
        sensors={sensores}
        collisionDetection={pointerWithin}
        onDragStart={({ active }) => { arrastrandoRef.current = true; setActiva(active.id); }}
        onDragCancel={() => { arrastrandoRef.current = false; setActiva(null); }}
        onDragEnd={alSoltar}
      >
        <div className="scroll-x -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
          {COLUMNAS.map((c) => (
            <Columna
              key={c.id} col={c} tareas={columnas?.[c.id] ?? []}
              puedeMover={esDev} onTocar={setDetalle} activa={activa}
            />
          ))}
        </div>

        <DragOverlay>
          {tareaActiva && (
            <div className="tarjeta rotate-2 p-2.5 shadow-xl ring-2 ring-marca-400">
              <p className="text-[10px] font-semibold text-marca-600">{tareaActiva.historia_codigo}</p>
              <p className="mt-0.5 text-[13px] font-medium text-slate-800">{tareaActiva.titulo}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="text-center text-[11px] text-slate-400">
        {esDev ? 'Arrastre una tarjeta o toquela para moverla' : 'Toque una tarjeta para ver el detalle'}
      </p>

      {/* Detalle: alternativa al arrastre, mas segura en la demo */}
      <Hoja abierta={!!detalle} onCerrar={() => setDetalle(null)} titulo={detalle?.titulo ?? ''}>
        {detalle && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <Link to={`/historia/${detalle.historia_id}`} className="text-sm font-medium text-marca-600">
                {detalle.historia_codigo} · {detalle.historia_titulo} →
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                {detalle.asignado_nombre ?? 'Nadie la ha asumido'} · {detalle.horas_estimadas}h estimadas
              </p>
            </div>

            {esDev ? (
              <>
                <div>
                  <p className="titulo-seccion mb-2">Mover a</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COLUMNAS.filter((c) => c.id !== detalle.estado).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { mover(detalle.id, c.id); setDetalle(null); }}
                        className="btn-secundario justify-start"
                      >
                        <span className={`h-2 w-2 rounded-full ${c.color}`} />{c.texto}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => asumir(detalle.id)}
                    disabled={detalle.asignado_a === usuario.id}
                    className="btn-primario"
                  >
                    {detalle.asignado_a === usuario.id ? 'Ya es suya' : 'Asumir tarea'}
                  </button>
                  <button onClick={() => bloquear(detalle)}
                          className={detalle.bloqueada ? 'btn-secundario' : 'btn-peligro'}>
                    {detalle.bloqueada ? 'Quitar bloqueo' : 'Marcar bloqueada'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  En Scrum nadie reparte el trabajo: cada Developer asume sus tareas.
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Solo los Developers gestionan el Sprint Backlog y mueven las tarjetas.
              </p>
            )}
          </div>
        )}
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
