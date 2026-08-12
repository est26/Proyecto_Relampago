import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Aviso } from '../components/UI.jsx';

const DEMO = [
  { email: 'ana@sprintcuc.cr',   nombre: 'Ana Rodriguez',   rol: 'Product Owner', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { email: 'marco@sprintcuc.cr', nombre: 'Marco Jimenez',   rol: 'Scrum Master',  color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { email: 'jose@sprintcuc.cr',  nombre: 'Jose Hernandez',  rol: 'Developer',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { email: 'lucia@sprintcuc.cr', nombre: 'Lucia Vargas',    rol: 'Developer',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
];

/* Ingreso */
export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e, correo = email) => {
    e?.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await entrar(correo, password);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-slate-100 px-5 py-10">
      <div className="mb-7 text-center">
        <img src="/icono.svg" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-md" />
        <h1 className="mt-4 text-2xl font-bold text-slate-800">SprintCUC</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ejecute y evidencie un Sprint completo desde el telefono
        </p>
      </div>

      <form onSubmit={enviar} className="tarjeta space-y-3 p-5">
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input
            id="email" type="email" required autoComplete="username"
            className="campo" value={email} placeholder="usuario@sprintcuc.cr"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="clave">Contrasena</label>
          <input
            id="clave" type="password" required autoComplete="current-password"
            className="campo" value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Aviso error={error} onCerrar={() => setError(null)} />

        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Iniciar sesion'}
        </button>
      </form>

      <div className="mt-6">
        <p className="titulo-seccion mb-2 text-center">Acceso rapido para la demostracion</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((u) => (
            <button
              key={u.email}
              onClick={(e) => { setEmail(u.email); enviar(e, u.email); }}
              disabled={enviando}
              className={`rounded-xl border p-3 text-left transition active:scale-[.97] ${u.color}`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">{u.rol}</span>
              <span className="mt-0.5 block text-sm font-semibold">{u.nombre}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Todos usan la contrasena <code className="font-semibold">demo1234</code>
        </p>
      </div>
    </div>
  );
}
