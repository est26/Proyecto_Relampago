import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [producto, setProducto] = useState(null);   // producto activo
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const yo = await api.yo();
      setUsuario(yo);
      setProducto((prev) => {
        if (prev) return yo.productos.find((p) => p.id === prev.id) ?? yo.productos[0] ?? null;
        return yo.productos[0] ?? null;
      });
    } catch {
      setUsuario(null);
      setProducto(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const entrar = async (email, password) => {
    await api.login(email, password);
    await cargar();
  };

  const salir = async () => {
    await api.salir();
    setUsuario(null);
    setProducto(null);
  };

  const valor = {
    usuario,
    producto,
    setProducto,
    cargando,
    entrar,
    salir,
    recargar: cargar,
    rol: producto?.rol ?? null,
    esPO: producto?.rol === 'PO',
    esSM: producto?.rol === 'SM',
    esDev: producto?.rol === 'DEV'
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
