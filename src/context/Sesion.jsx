import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { puede as puedeRol } from '../../shared/reglas.js'

// Sesión del usuario demo + avisos (toasts). La sesión vive en sessionStorage:
// se pierde al cerrar la pestaña, como un login real sin "recordarme".
const SesionCtx = createContext(null)
const CLAVE = 'panel150:sesion'

const leerSesion = () => {
  try {
    return Number(sessionStorage.getItem(CLAVE)) || null
  } catch {
    return null
  }
}

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [verificando, setVerificando] = useState(() => leerSesion() != null)
  const [avisos, setAvisos] = useState([])
  const contador = useRef(0)

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = ++contador.current
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500)
  }, [])

  const entrar = useCallback((u) => {
    api.setSesion(u.id)
    setUsuario(u)
    try {
      sessionStorage.setItem(CLAVE, String(u.id))
    } catch {
      // sin sessionStorage la sesión dura hasta recargar
    }
  }, [])

  const salir = useCallback(() => {
    api.setSesion(null)
    setUsuario(null)
    try {
      sessionStorage.removeItem(CLAVE)
    } catch {
      // nada que limpiar
    }
  }, [])

  // Al recargar, recupera la sesión si el usuario sigue activo.
  useEffect(() => {
    const id = leerSesion()
    if (!id) return
    api
      .usuariosDemo()
      .then((lista) => {
        const u = lista.find((x) => x.id === id)
        if (u) entrar(u)
        else salir()
      })
      .catch(() => salir())
      .finally(() => setVerificando(false))
  }, [entrar, salir])

  const valor = useMemo(
    () => ({
      usuario,
      verificando,
      entrar,
      salir,
      // Actualiza los datos del usuario en sesión (por ejemplo, si un admin se edita a sí mismo).
      refrescarUsuario: (u) => setUsuario((actual) => (actual && actual.id === u.id ? u : actual)),
      puede: (permiso) => !!usuario && puedeRol(usuario.rol, permiso),
      avisar,
      avisos,
    }),
    [usuario, verificando, entrar, salir, avisar, avisos],
  )
  return <SesionCtx.Provider value={valor}>{children}</SesionCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSesion = () => useContext(SesionCtx)
