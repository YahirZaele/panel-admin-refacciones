import { Link, Route, Routes } from 'react-router-dom'
import { useSesion } from './context/Sesion'
import Layout from './components/Layout'
import { Cargando } from './components/ui'
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Productos from './pages/Productos'
import { PedidoDetalle, Pedidos } from './pages/Pedidos'
import Usuarios from './pages/Usuarios'
import Bitacora from './pages/Bitacora'

// Protege una ruta según el permiso del rol (la API también lo valida: esto es solo la interfaz).
function ConPermiso({ permiso, children }) {
  const { puede } = useSesion()
  if (puede(permiso)) return children
  return (
    <div className="panel">
      <h1>Sin permiso</h1>
      <p className="muted">Tu rol no tiene acceso a esta sección.</p>
      <Link to="/">Volver al resumen</Link>
    </div>
  )
}

function Avisos() {
  const { avisos } = useSesion()
  return (
    <div className="avisos" aria-live="polite">
      {avisos.map((a) => (
        <p key={a.id} className={`toast toast-${a.tipo}`}>
          {a.texto}
        </p>
      ))}
    </div>
  )
}

export default function App() {
  const { usuario, verificando } = useSesion()

  let contenido
  if (verificando) contenido = <Cargando texto="Recuperando sesión…" />
  else if (!usuario) contenido = <Login />
  else
    contenido = (
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Resumen />} />
          <Route path="productos" element={<ConPermiso permiso="productos:ver"><Productos /></ConPermiso>} />
          <Route path="pedidos" element={<ConPermiso permiso="pedidos:ver"><Pedidos /></ConPermiso>} />
          <Route path="pedidos/:folio" element={<ConPermiso permiso="pedidos:ver"><PedidoDetalle /></ConPermiso>} />
          <Route path="usuarios" element={<ConPermiso permiso="usuarios:ver"><Usuarios /></ConPermiso>} />
          <Route path="bitacora" element={<ConPermiso permiso="bitacora:ver"><Bitacora /></ConPermiso>} />
          <Route
            path="*"
            element={
              <div className="panel">
                <h1>Página no encontrada</h1>
                <Link to="/">Volver al resumen</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    )

  return (
    <>
      <div className="demo-banner" role="note">
        Proyecto de portafolio: panel de una tienda ficticia. Los datos son de ejemplo.
      </div>
      {contenido}
      <Avisos />
    </>
  )
}
