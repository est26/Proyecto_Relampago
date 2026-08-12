import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Rol, Hoja } from './UI.jsx';

const NAV = [
  { a: '/', icono: '◉', texto: 'Inicio', exacto: true },
  { a: '/backlog', icono: '☰', texto: 'Backlog' },
  { a: '/tablero', icono: '▦', texto: 'Tablero' },
  { a: '/daily', icono: '◔', texto: 'Daily' },
  { a: '/sprint', icono: '↻', texto: 'Sprint' }
];

const MAS = [
  { a: '/metricas', icono: '📈', texto: 'Indicadores', desc: 'Burndown, Velocity y cumplimiento' },
  { a: '/impedimentos', icono: '⚠️', texto: 'Impedimentos', desc: 'Reportar y dar seguimiento' },
  { a: '/cierre', icono: '🏁', texto: 'Cierre del Sprint', desc: 'Incremento, Review y Retrospective' },
  { a: '/equipo', icono: '👥', texto: 'Equipo y DoD', desc: 'Responsabilidades, capacidad y Definition of Done' }
];

export default function Layout() {
  const { usuario, producto, salir } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();

  const cerrarSesion = async () => { await salir(); nav('/login'); };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-slate-100">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 bg-marca-700 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight">
              {producto?.nombre ?? 'SprintCUC'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-marca-100">
              {usuario?.nombre}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {producto?.rol && <Rol rol={producto.rol} />}
            <button
              onClick={() => setMenu(true)}
              aria-label="Mas opciones"
              className="rounded-lg bg-white/15 px-2.5 py-1.5 text-sm leading-none"
            >⋯</button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">
        <Outlet />
      </main>

      {/* Navegacion inferior: alcance del pulgar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-slate-200
                      bg-white/95 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="grid grid-cols-5">
          {NAV.map((n) => (
            <NavLink
              key={n.a}
              to={n.a}
              end={n.exacto}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  isActive ? 'text-marca-700' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{n.icono}</span>
              {n.texto}
            </NavLink>
          ))}
        </div>
      </nav>

      <Hoja abierta={menu} onCerrar={() => setMenu(false)} titulo="Mas opciones">
        <div className="space-y-2">
          {MAS.map((m) => (
            <button
              key={m.a}
              onClick={() => { setMenu(false); nav(m.a); }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left active:bg-slate-50"
            >
              <span className="text-xl">{m.icono}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{m.texto}</span>
                <span className="block text-xs text-slate-500">{m.desc}</span>
              </span>
            </button>
          ))}
          <button onClick={cerrarSesion} className="btn-secundario mt-2 w-full text-rose-600">
            Cerrar sesion
          </button>
        </div>
      </Hoja>
    </div>
  );
}
