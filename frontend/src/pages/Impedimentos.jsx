import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Hoja, Toast, Vacio, Prioridad } from '../components/UI.jsx';

const ESTADOS = {
  abierto:     { texto: 'Abierto',     clase: 'bg-rose-100 text-rose-700' },
  gestionando: { texto: 'Gestionando', clase: 'bg-amber-100 text-amber-700' },
  escalado:    { texto: 'Escalado',    clase: 'bg-violet-100 text-violet-700' },
  resuelto:    { texto: 'Resuelto',    clase: 'bg-emerald-100 text-emerald-700' }
};

export default function Impedimentos() {
  const { producto, esSM } = useAuth();
  const [sprint, setSprint] = useState(null);
  const [datos, setDatos] = useState(null);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [gestionando, setGestionando] = useState(null);

  const cargar = async (sprintId) => {
    try { setDatos(await api.impedimentos(sprintId)); setError(null); }
    catch (e) { setError(e); } finally { setCargando(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [lista, eq] = await Promise.all([api.sprints(producto.id), api.equipo(producto.id)]);
        setEquipo(eq);
        const act = lista.find((s) => s.estado === 'activo') ?? lista[0];
        setSprint(act ?? null);
        if (act) await cargar(act.id); else setCargando(false);
      } catch (e) { setError(e); setCargando(false); }
    })();
  }, [producto?.id]);

  const crear = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.crearImpedimento({
        sprint_id: sprint.id,
        descripcion: f.get('descripcion'),
        prioridad: f.get('prioridad')
      });
      setNuevo(false); setAviso('Impedimento reportado'); cargar(sprint.id);
    } catch (e2) { setNuevo(false); setError(e2); }
  };

  const gestionar = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.actualizarImpedimento(gestionando.id, {
        estado: f.get('estado'),
        prioridad: f.get('prioridad'),
        responsable_id: Number(f.get('responsable')) || null
      });
      setGestionando(null); setAviso('Impedimento actualizado'); cargar(sprint.id);
    } catch (e2) { setGestionando(null); setError(e2); }
  };

  if (cargando) return <Cargando />;
  if (!sprint) return <Vacio titulo="No hay Sprints" />;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Impedimentos</h1>
          <p className="text-xs text-slate-500">
            Sprint {sprint.numero} · {datos?.abiertos ?? 0} sin resolver
            {datos?.mas_antiguo > 0 && ` · el mas antiguo lleva ${datos.mas_antiguo} h`}
          </p>
        </div>
        <button onClick={() => setNuevo(true)} className="btn-primario btn-chico">+ Reportar</button>
      </div>

      <Aviso error={error} onCerrar={() => setError(null)} />

      <p className="rounded-lg bg-slate-200/60 px-3 py-2 text-[11px] text-slate-600">
        Cualquiera reporta un impedimento. Removerlos es responsabilidad del Scrum Master
        {!esSM && ', por eso el seguimiento solo lo edita él'}.
      </p>

      {datos?.impedimentos.length === 0 ? (
        <Vacio titulo="Sin impedimentos" texto="Nada esta bloqueando al equipo ahora mismo." />
      ) : (
        <ul className="space-y-2">
          {datos.impedimentos.map((i) => {
            const e = ESTADOS[i.estado];
            const viejo = i.estado !== 'resuelto' && i.horas_abierto >= 24;
            return (
              <li key={i.id} className={`tarjeta p-3 ${viejo ? 'border-l-4 border-l-rose-500' : ''}`}>
                <p className="text-sm leading-snug text-slate-800">{i.descripcion}</p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`pastilla ${e.clase}`}>{e.texto}</span>
                  <Prioridad nivel={i.prioridad} />
                  <span className={`pastilla ${viejo ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {i.estado === 'resuelto' ? `resuelto en ${i.horas_abierto} h` : `abierto hace ${i.horas_abierto} h`}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  Reportado por {i.reportado_por_nombre ?? '—'}
                  {i.responsable_nombre && ` · seguimiento: ${i.responsable_nombre}`}
                </p>

                {esSM && i.estado !== 'resuelto' && (
                  <button onClick={() => setGestionando(i)}
                          className="btn-secundario btn-chico mt-2 w-full">
                    Gestionar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Hoja abierta={nuevo} onCerrar={() => setNuevo(false)} titulo="Reportar impedimento">
        <form onSubmit={crear} className="space-y-3">
          <div><label className="etiqueta">¿Que esta bloqueando al equipo? *</label>
            <textarea name="descripcion" required rows="3" className="campo" /></div>
          <div><label className="etiqueta">Criticidad</label>
            <select name="prioridad" className="campo" defaultValue="media">
              <option value="baja">Baja</option><option value="media">Media</option>
              <option value="alta">Alta</option><option value="critica">Critica</option>
            </select></div>
          <button className="btn-primario w-full">Reportar</button>
        </form>
      </Hoja>

      <Hoja abierta={!!gestionando} onCerrar={() => setGestionando(null)} titulo="Gestionar impedimento">
        <form onSubmit={gestionar} className="space-y-3">
          <p className="text-sm text-slate-600">{gestionando?.descripcion}</p>
          <div><label className="etiqueta">Estado</label>
            <select name="estado" className="campo" defaultValue={gestionando?.estado}>
              <option value="abierto">Abierto</option>
              <option value="gestionando">Gestionando</option>
              <option value="escalado">Escalado fuera del equipo</option>
              <option value="resuelto">Resuelto</option>
            </select></div>
          <div><label className="etiqueta">Criticidad</label>
            <select name="prioridad" className="campo" defaultValue={gestionando?.prioridad}>
              <option value="baja">Baja</option><option value="media">Media</option>
              <option value="alta">Alta</option><option value="critica">Critica</option>
            </select></div>
          <div><label className="etiqueta">Responsable del seguimiento</label>
            <select name="responsable" className="campo" defaultValue={gestionando?.responsable_id ?? ''}>
              <option value="">Sin asignar</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.rol})</option>)}
            </select></div>
          <button className="btn-primario w-full">Guardar</button>
        </form>
      </Hoja>

      <Toast mensaje={aviso} onCerrar={() => setAviso(null)} />
    </div>
  );
}
