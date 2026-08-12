import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Hoja, Toast, EstadoHistoria, Puntos, Vacio } from '../components/UI.jsx';

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

/* ---------------- Fila arrastrable ---------------- */
function Fila({ item, puedeArrastrar, onEstimar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !puedeArrastrar });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined
  };

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={`tarjeta flex gap-2 p-3 ${isDragging ? 'shadow-lg ring-2 ring-marca-300' : ''}`}
    >
      {puedeArrastrar && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para priorizar"
          className="sin-scroll-touch -m-1 shrink-0 cursor-grab px-1 text-lg text-slate-300 active:cursor-grabbing"
        >⠿</button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/historia/${item.id}`} className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-marca-600">
              {item.codigo} {item.epica && `· ${item.epica}`}
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{item.titulo}</p>
          </Link>
          <span className="shrink-0 text-[11px] font-bold text-slate-300">#{item.prioridad_orden}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <EstadoHistoria estado={item.estado} />
          {onEstimar ? (
            <button onClick={() => onEstimar(item)} className="active:scale-95">
              <Puntos valor={item.story_points} />
            </button>
          ) : (
            <Puntos valor={item.story_points} />
          )}
          {item.sprint_numero && (
            <span className="pastilla bg-sky-100 text-sky-700">Sprint {item.sprint_numero}</span>
          )}
          {item.total_tareas > 0 && (
            <span className="pastilla bg-slate-100 text-slate-600">
              {item.tareas_listas}/{item.total_tareas} tareas
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------------- Pantalla ---------------- */
export default function Backlog() {
  const { producto, esPO, esDev } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [estado, setEstado] = useState('');
  const [nueva, setNueva] = useState(false);
  const [estimando, setEstimando] = useState(null);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const cargar = async () => {
    setCargando(true);
    try {
      const filtros = {};
      if (filtro) filtros.q = filtro;
      if (estado) filtros.estado = estado;
      setItems(await api.backlog(producto.id, filtros));
      setError(null);
    } catch (e) { setError(e); } finally { setCargando(false); }
  };

  useEffect(() => {
    const t = setTimeout(cargar, filtro ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto?.id, filtro, estado]);

  /* HU-022: solo el Product Owner ordena el Product Backlog */
  const alSoltar = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const antes = items;
    const desde = items.findIndex((i) => i.id === active.id);
    const hasta = items.findIndex((i) => i.id === over.id);
    const nuevo = arrayMove(items, desde, hasta).map((it, i) => ({ ...it, prioridad_orden: i + 1 }));
    setItems(nuevo);   // respuesta inmediata

    try {
      await api.reordenar(producto.id, nuevo.map((i) => ({ id: i.id, orden: i.prioridad_orden })));
      setAviso('Prioridad actualizada');
    } catch (e) {
      setItems(antes);  // revertir si el servidor lo rechaza
      setError(e);
    }
  };

  const estimar = async (puntos) => {
    try {
      await api.estimar(estimando.id, puntos);
      setEstimando(null);
      setAviso(`Estimada en ${puntos} Story Points`);
      cargar();
    } catch (e) { setEstimando(null); setError(e); }
  };

  const crear = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.crearHistoria({
        product_id: producto.id,
        codigo: f.get('codigo') || null,
        epica: f.get('epica') || null,
        titulo: f.get('titulo'),
        como: f.get('como'),
        quiero: f.get('quiero'),
        para: f.get('para'),
        criterios_aceptacion: f.get('criterios')
      });
      setNueva(false);
      setAviso('Historia agregada al Product Backlog');
      cargar();
    } catch (err) { setNueva(false); setError(err); }
  };

  const totalPuntos = items.reduce((a, i) => a + (i.story_points || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Product Backlog</h1>
          <p className="text-xs text-slate-500">
            {items.length} historias · {totalPuntos} SP
            {esPO && ' · arrastre ⠿ para priorizar'}
          </p>
        </div>
        {esPO && (
          <button onClick={() => setNueva(true)} className="btn-primario btn-chico">+ Historia</button>
        )}
      </div>

      {/* HU-025 / HU-026 */}
      <div className="flex gap-2">
        <input
          className="campo flex-1" placeholder="Buscar historia..."
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
        />
        <select className="campo w-32" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todas</option>
          <option value="backlog">Backlog</option>
          <option value="sprint">En Sprint</option>
          <option value="en_progreso">En progreso</option>
          <option value="done">Terminadas</option>
        </select>
      </div>

      <Aviso error={error} onCerrar={() => setError(null)} />

      {!esPO && (
        <p className="rounded-lg bg-slate-200/60 px-3 py-2 text-[11px] text-slate-600">
          Solo el Product Owner ordena el Product Backlog.
          {esDev && ' Usted puede estimar: toque los Story Points de una historia.'}
        </p>
      )}

      {cargando ? (
        <Cargando />
      ) : items.length === 0 ? (
        <Vacio titulo="Sin historias" texto="El Product Owner aun no ha agregado elementos." />
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={alSoltar}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <Fila
                  key={item.id}
                  item={item}
                  puedeArrastrar={esPO && !filtro && !estado}
                  onEstimar={esDev ? setEstimando : null}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Estimacion: solo Developers */}
      <Hoja abierta={!!estimando} onCerrar={() => setEstimando(null)} titulo="Estimar en Story Points">
        <p className="mb-1 text-sm font-medium text-slate-700">{estimando?.titulo}</p>
        <p className="mb-4 text-xs text-slate-500">
          Estiman los Developers, que son quienes haran el trabajo. Serie de Fibonacci.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {FIBONACCI.map((p) => (
            <button
              key={p} onClick={() => estimar(p)}
              className={`rounded-xl border-2 py-4 text-lg font-bold transition active:scale-95 ${
                estimando?.story_points === p
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-200 text-slate-700'
              }`}
            >{p}</button>
          ))}
        </div>
      </Hoja>

      {/* Nueva historia: solo Product Owner */}
      <Hoja abierta={nueva} onCerrar={() => setNueva(false)} titulo="Nueva historia de usuario">
        <form onSubmit={crear} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="etiqueta">Codigo</label>
              <input name="codigo" className="campo" placeholder="HU-045" /></div>
            <div><label className="etiqueta">Epica</label>
              <input name="epica" className="campo" placeholder="Tablero Scrum" /></div>
          </div>
          <div><label className="etiqueta">Titulo *</label>
            <input name="titulo" required className="campo" placeholder="Filtrar el tablero por persona" /></div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="titulo-seccion mb-2">Formato de historia de usuario</p>
            <div className="space-y-2">
              <div><label className="etiqueta">Como...</label>
                <input name="como" className="campo" placeholder="Developer" /></div>
              <div><label className="etiqueta">Quiero...</label>
                <input name="quiero" className="campo" placeholder="filtrar las tareas por persona" /></div>
              <div><label className="etiqueta">Para...</label>
                <input name="para" className="campo" placeholder="ver rapido lo que me toca" /></div>
            </div>
          </div>

          <div><label className="etiqueta">Criterios de aceptacion</label>
            <textarea name="criterios" rows="4" className="campo"
              placeholder={'- El filtro se combina con el de historia\n- No recarga la pantalla'} /></div>

          <button className="btn-primario w-full">Agregar al Product Backlog</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
