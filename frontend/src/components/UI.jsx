import { useEffect, useState } from 'react';

/* ---------- Estados de carga y error ---------- */

export function Cargando({ texto = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-marca-600" />
      <p className="mt-3 text-sm">{texto}</p>
    </div>
  );
}

export function Vacio({ titulo, texto, accion }) {
  return (
    <div className="tarjeta p-8 text-center">
      <p className="font-semibold text-slate-700">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-slate-500">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

/**
 * Aviso de error.
 * Cuando la API deniega por rol, muestra la explicacion en terminos de
 * Scrum en vez de un mensaje tecnico. Es lo que se ensena en la demo.
 */
export function Aviso({ error, onCerrar }) {
  if (!error) return null;
  const esPermiso = error.status === 403;
  const esBloqueo = error.status === 422;

  const estilo = esPermiso
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : esBloqueo
      ? 'bg-rose-50 border-rose-300 text-rose-900'
      : 'bg-slate-50 border-slate-300 text-slate-700';

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${estilo}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {esPermiso ? '⛔ ' : esBloqueo ? '🚫 ' : ''}{error.message}
          </p>
          {error.detalle && <p className="mt-1 opacity-90">{error.detalle}</p>}
          {error.faltantes?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {error.faltantes.map((f) => (
                <li key={f} className="flex gap-2"><span>•</span><span>{f}</span></li>
              ))}
            </ul>
          )}
          {error.tuRol && <p className="mt-1.5 text-xs opacity-70">Su rol: {error.tuRol}</p>}
        </div>
        {onCerrar && (
          <button onClick={onCerrar} className="shrink-0 text-lg leading-none opacity-50">×</button>
        )}
      </div>
    </div>
  );
}

/* ---------- Mensaje flotante ---------- */

export function Toast({ mensaje, onCerrar }) {
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(onCerrar, 3200);
    return () => clearTimeout(t);
  }, [mensaje, onCerrar]);

  if (!mensaje) return null;
  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg">
      {mensaje}
    </div>
  );
}

/* ---------- Hoja inferior (patron movil) ---------- */

export function Hoja({ abierta, onCerrar, titulo, children }) {
  useEffect(() => {
    document.body.style.overflow = abierta ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierta]);

  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCerrar} />
      <div className="relative w-full max-w-lg animate-[subir_.2s_ease-out] rounded-t-2xl bg-white
                      p-4 pb-8 shadow-xl max-h-[88vh] overflow-y-auto">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{titulo}</h2>
          <button onClick={onCerrar} className="text-2xl leading-none text-slate-400">×</button>
        </div>
        {children}
      </div>
      <style>{`@keyframes subir{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

/* ---------- Distintivos ---------- */

const ROLES = {
  PO:  { texto: 'Product Owner', clase: 'bg-violet-100 text-violet-700' },
  SM:  { texto: 'Scrum Master',  clase: 'bg-sky-100 text-sky-700' },
  DEV: { texto: 'Developer',     clase: 'bg-emerald-100 text-emerald-700' }
};

export function Rol({ rol, corto = false }) {
  const r = ROLES[rol];
  if (!r) return null;
  return <span className={`pastilla ${r.clase}`}>{corto ? rol : r.texto}</span>;
}

const ESTADOS_HISTORIA = {
  backlog:     { texto: 'Backlog',      clase: 'bg-slate-100 text-slate-600' },
  sprint:      { texto: 'En el Sprint', clase: 'bg-marca-100 text-marca-700' },
  en_progreso: { texto: 'En progreso',  clase: 'bg-amber-100 text-amber-700' },
  done:        { texto: 'Terminada',    clase: 'bg-emerald-100 text-emerald-700' }
};

export function EstadoHistoria({ estado }) {
  const e = ESTADOS_HISTORIA[estado] ?? ESTADOS_HISTORIA.backlog;
  return <span className={`pastilla ${e.clase}`}>{e.texto}</span>;
}

export function Puntos({ valor }) {
  if (valor === null || valor === undefined) {
    return <span className="pastilla bg-rose-50 text-rose-600">sin estimar</span>;
  }
  return <span className="pastilla bg-slate-800 text-white">{valor} SP</span>;
}

export function Prioridad({ nivel }) {
  const c = {
    critica: 'bg-rose-100 text-rose-700',
    alta: 'bg-orange-100 text-orange-700',
    media: 'bg-amber-100 text-amber-700',
    baja: 'bg-slate-100 text-slate-600'
  }[nivel] ?? 'bg-slate-100 text-slate-600';
  return <span className={`pastilla ${c}`}>{nivel}</span>;
}

/* ---------- Barra de progreso ---------- */

export function Barra({ valor, max, color = 'bg-marca-600', alto = 'h-2' }) {
  const pct = max ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-200 ${alto}`}>
      <div className={`${alto} ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Hook: pedir datos ---------- */

export function usePeticion(fn, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tic, setTic] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    fn()
      .then((d) => vivo && (setDatos(d), setError(null)))
      .catch((e) => vivo && setError(e))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tic]);

  return { datos, error, cargando, recargar: () => setTic((t) => t + 1), setDatos };
}
