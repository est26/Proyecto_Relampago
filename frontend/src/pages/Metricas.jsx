import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Vacio, Barra } from '../components/UI.jsx';

const dia = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '');

export default function Metricas() {
  const { producto } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [sprintId, setSprintId] = useState(null);
  const [burndown, setBurndown] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [cumpl, setCumpl] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [lista, v] = await Promise.all([api.sprints(producto.id), api.velocity(producto.id)]);
        setSprints(lista); setVelocity(v);
        const act = lista.find((s) => s.estado === 'activo') ?? lista[0];
        if (act) setSprintId(act.id); else setCargando(false);
      } catch (e) { setError(e); setCargando(false); }
    })();
  }, [producto?.id]);

  useEffect(() => {
    if (!sprintId) return;
    setCargando(true);
    Promise.all([api.burndown(sprintId), api.cumplimiento(sprintId)])
      .then(([b, c]) => { setBurndown(b); setCumpl(c); setError(null); })
      .catch(setError)
      .finally(() => setCargando(false));
  }, [sprintId]);

  if (cargando && !burndown) return <Cargando />;
  if (error) return <Aviso error={error} />;
  if (!sprintId) return <Vacio titulo="Sin Sprints" texto="Los indicadores se calculan sobre un Sprint." />;

  const datosBurndown = burndown?.puntos.map((p) => ({
    dia: dia(p.dia), ideal: p.ideal, real: p.restante
  })) ?? [];

  const datosVelocity = velocity?.sprints.map((s) => ({
    nombre: `S${s.numero}`, comprometidos: s.comprometidos, completados: s.completados
  })) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Indicadores</h1>
        <p className="text-xs text-slate-500">Calculados sobre el historial real de la aplicacion</p>
        <select className="campo mt-2" value={sprintId} onChange={(e) => setSprintId(Number(e.target.value))}>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>Sprint {s.numero} · {s.estado}</option>
          ))}
        </select>
      </div>

      {/* ---------- Burndown ---------- */}
      <section className="tarjeta p-4">
        <div className="mb-1 flex items-start justify-between">
          <p className="titulo-seccion">Burndown</p>
          <span className="pastilla bg-marca-100 text-marca-700">
            {burndown?.restante_hoy} SP restantes
          </span>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">
          Reconstruido desde cada cambio de estado registrado, no desde datos fijos.
        </p>

        <div className="-ml-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosBurndown} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v, n) => [v === null ? '—' : `${v} SP`, n === 'ideal' ? 'Ideal' : 'Real']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'ideal' ? 'Ideal' : 'Real')} />
              <Line type="monotone" dataKey="ideal" stroke="#cbd5e1" strokeWidth={2}
                    strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="real" stroke="#2f56b3" strokeWidth={2.5}
                    dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ---------- Cumplimiento ---------- */}
      {cumpl && (
        <section className="tarjeta p-4">
          <p className="titulo-seccion mb-3">Cumplimiento del Sprint</p>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-500">Story Points</span>
                <span className="font-semibold text-slate-700">
                  {cumpl.puntos_hechos} / {cumpl.puntos} · {cumpl.porcentaje_puntos}%
                </span>
              </div>
              <Barra valor={cumpl.puntos_hechos} max={cumpl.puntos} color="bg-marca-600" alto="h-2.5" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-500">Historias</span>
                <span className="font-semibold text-slate-700">
                  {cumpl.terminadas} / {cumpl.historias} · {cumpl.porcentaje_historias}%
                </span>
              </div>
              <Barra valor={cumpl.terminadas} max={cumpl.historias} color="bg-emerald-500" alto="h-2.5" />
            </div>
          </div>
        </section>
      )}

      {/* ---------- Velocity ---------- */}
      <section className="tarjeta p-4">
        <div className="mb-1 flex items-start justify-between">
          <p className="titulo-seccion">Velocity</p>
          <span className="pastilla bg-slate-800 text-white">
            promedio {velocity?.velocidad_promedio} SP
          </span>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">Solo Sprints cerrados.</p>

        {datosVelocity.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Aun no hay Sprints cerrados que comparar.
          </p>
        ) : (
          <>
            <div className="-ml-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosVelocity} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v, n) => [`${v} SP`, n === 'comprometidos' ? 'Comprometidos' : 'Completados']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }}
                          formatter={(v) => (v === 'comprometidos' ? 'Comprometidos' : 'Completados')} />
                  <Bar dataKey="comprometidos" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completados" fill="#2f56b3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 rounded-lg bg-marca-50 px-3 py-2 text-[11px] leading-relaxed text-marca-900">
              📊 {velocity.recomendacion}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
