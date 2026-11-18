import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSesion } from '../context/Sesion'
import { api, MODO } from '../api'
import { ROLES } from '../../shared/reglas.js'

const MENU = [
  { to: '/', label: 'Resumen', icono: '◧', permiso: null },
  { to: '/productos', label: 'Productos', icono: '▦', permiso: 'productos:ver' },
  { to: '/pedidos', label: 'Pedidos', icono: '☰', permiso: 'pedidos:ver' },
  { to: '/usuarios', label: 'Usuarios y roles', icono: '◉', permiso: 'usuarios:ver' },
  { to: '/bitacora', label: 'Bitácora', icono: '⧗', permiso: 'bitacora:ver' },
]

export default function Layout() {
  const { usuario, salir, puede, avisar } = useSesion()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const navegar = useNavigate()

  async function reiniciar() {
    await api.reiniciar()
    salir()
    navegar('/')
    avisar('Se restauraron los datos de ejemplo.')
  }

  return (
    <div className="shell">
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="marca">
          <span className="marca-logo" aria-hidden="true">
            R
          </span>
          <div>
            <strong>Ruta 150</strong>
            <small>Panel de administración</small>
          </div>
        </div>
        <nav aria-label="Secciones">
          {MENU.filter((m) => !m.permiso || puede(m.permiso)).map((m) => (
            <NavLink key={m.to} to={m.to} end={m.to === '/'} onClick={() => setMenuAbierto(false)}>
              <span aria-hidden="true">{m.icono}</span> {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <p className="small">
            {MODO === 'demo' ? 'Modo demo: los cambios se guardan solo en este navegador.' : 'Conectado a la API.'}
          </p>
          <button type="button" className="btn-link" onClick={reiniciar}>
            Restaurar datos de ejemplo
          </button>
        </div>
      </aside>

      <div className="principal">
        <header className="topbar">
          <button type="button" className="btn-icon menu-btn" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto} aria-label="Menú">
            ☰
          </button>
          <div className="usuario">
            <span className="avatar" aria-hidden="true">
              {usuario.nombre
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <strong>{usuario.nombre}</strong>
              <small className={`rol rol-${usuario.rol}`}>{ROLES[usuario.rol]}</small>
            </span>
          </div>
          <button type="button" className="btn btn-sec" onClick={salir}>
            Cerrar sesión
          </button>
        </header>
        <main id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

    </div>
  )
}
