import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Cargando, Aviso, Barra, Vacio, usePeticion } from '../components/UI.jsx';

function Dato({ valor, texto, color = 'text-slate-800' }) {
  return (
    <div className="tarjeta p-3 text-center">
      <p className={`text-2xl font-bold leading-none ${color}`}>{valor}</p>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">{texto}</p>
    </div>
  );
}

export default function Dashboard() {
  const { producto } = useAuth();
  const { datos, error, cargando } = usePeticion(
    () => api.dashboard(producto.id), [producto?.id]
  );

  if (cargando) return <Cargando />;
  if (error) return <Aviso error={error} />;

  const s = datos.sprint_actual;

  return (
    <div className="space-y-4">
      {/* Product Goal: el ancla de toda la trazabilidad */}
      <section className="tarjeta border-l-4 border-l-violet-500 p-4">
        <p className="titulo-seccion">Product Goal</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
          {datos.producto.product_goal}
        </p>
      </section>

      {!s ? (
        <Vacio
          titulo="No hay ningun Sprint activo"
          texto="El Scrum Master debe abrir el siguiente Sprint."
          accion={<Link to="/sprint" className="btn-primario">Ir a Sprints</Link>}
        />
      ) : (
        <>
          <section className="tarjeta border-l-4 border-l-marca-600 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="titulo-seccion">Sprint {s.numero} · Sprint Goal</p>
              <span className="pastilla bg-marca-100 text-marca-700">
                {s.dias_restantes} dias restantes
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{s.sprint_goal}</p>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{s.completados} de {s.comprometidos} Story Points</span>
                <span className="font-semibold text-slate-700">{s.porcentaje}%</span>
              </div>
              <Barra valor={s.completados} max={s.comprometidos} alto="h-2.5" />
            </div>
          </section>

          <div className="grid grid-cols-3 gap-2">
            <Dato valor={`${s.historias_done}/${s.historias}`} texto="Historias terminadas" />
            <Dato valor={`${datos.tareas.terminadas}/${datos.tareas.total}`} texto="Tareas listas" />
            <Dato
              valor={datos.tareas.bloqueadas}
              texto="Tareas bloqueadas"
              color={datos.tareas.bloqueadas ? 'text-rose-600' : 'text-slate-800'}
            />
            <Dato
              valor={datos.impedimentos.abiertos}
              texto="Impedimentos abiertos"
              color={datos.impedimentos.abiertos ? 'text-amber-600' : 'text-slate-800'}
            />
            <Dato valor={datos.dailies_hoy} texto="Dailies de hoy" />
            <Dato valor={datos.velocidad_promedio} texto="Velocidad promedio" color="text-marca-700" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/tablero" className="btn-primario">Ver el tablero</Link>
            <Link to="/daily" className="btn-secundario">Registrar mi Daily</Link>
          </div>
        </>
      )}

      <section className="tarjeta p-4">
        <p className="titulo-seccion mb-2">Product Backlog</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-slate-800">{datos.backlog.total}</p>
            <p className="text-[11px] text-slate-500">historias</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{datos.backlog.puntos_pendientes}</p>
            <p className="text-[11px] text-slate-500">puntos pendientes</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${datos.backlog.sin_estimar ? 'text-rose-600' : 'text-slate-800'}`}>
              {datos.backlog.sin_estimar}
            </p>
            <p className="text-[11px] text-slate-500">sin estimar</p>
          </div>
        </div>
        <Link to="/backlog" className="btn-secundario mt-3 w-full">Abrir el Product Backlog</Link>
      </section>

      <Link to="/metricas" className="btn-secundario w-full">📈 Ver indicadores del Sprint</Link>
    </div>
  );
}
