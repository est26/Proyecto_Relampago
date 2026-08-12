import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Cargando } from './components/UI.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Backlog from './pages/Backlog.jsx';
import Historia from './pages/Historia.jsx';
import Sprint from './pages/Sprint.jsx';
import Planning from './pages/Planning.jsx';
import Tablero from './pages/Tablero.jsx';
import Daily from './pages/Daily.jsx';
import Impedimentos from './pages/Impedimentos.jsx';
import Cierre from './pages/Cierre.jsx';
import Metricas from './pages/Metricas.jsx';
import Equipo from './pages/Equipo.jsx';

export default function App() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Cargando texto="Abriendo SprintCUC..." />
      </div>
    );
  }

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="backlog" element={<Backlog />} />
        <Route path="historia/:id" element={<Historia />} />
        <Route path="sprint" element={<Sprint />} />
        <Route path="planning/:id" element={<Planning />} />
        <Route path="tablero" element={<Tablero />} />
        <Route path="daily" element={<Daily />} />
        <Route path="impedimentos" element={<Impedimentos />} />
        <Route path="cierre" element={<Cierre />} />
        <Route path="metricas" element={<Metricas />} />
        <Route path="equipo" element={<Equipo />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
