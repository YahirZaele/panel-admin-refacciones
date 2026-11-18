import { useCallback } from 'react'
import { api } from '../api'
import { useCarga } from '../hooks'
import { useSesion } from '../context/Sesion'
import { Cargando, ErrorCarga } from '../components/ui'
import { PERMISOS, ROLES } from '../../shared/reglas.js'

const DESCRIPCION = {
  admin: 'Acceso total: catálogo, usuarios y bitácora.',
  almacen: 'Inventario y preparación/envío de pedidos.',
  ventas: 'Consulta catálogo, cancela y entrega pedidos.',
}

// Login de demostración: se elige un usuario ficticio para probar cada rol (sin contraseñas).
export default function Login() {
  const { entrar } = useSesion()
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.usuariosDemo(), []))

  return (
    <div className="login">
      <div className="login-card">
        <p className="eyebrow">Ruta 150 Refacciones</p>
        <h1>Panel de administración</h1>
        <p className="muted">
          Proyecto de portafolio con datos ficticios. Elige un usuario para entrar; cada rol ve y puede hacer cosas distintas.
        </p>
        {cargando && <Cargando texto="Cargando usuarios…" />}
        {error && <ErrorCarga error={error} onReintentar={recargar} />}
        {datos && (
          <ul className="login-usuarios">
            {datos.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => entrar(u)}>
                  <span className={`rol rol-${u.rol}`}>{ROLES[u.rol]}</span>
                  <strong>{u.nombre}</strong>
                  <small className="muted">{DESCRIPCION[u.rol]}</small>
                  <small className="muted">{PERMISOS[u.rol].length} permisos</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted">
          En una versión productiva el acceso sería con correo y contraseña (hash con bcrypt) y un token JWT.
        </p>
      </div>
    </div>
  )
}
