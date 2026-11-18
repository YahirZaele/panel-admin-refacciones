import { useCallback, useState } from 'react'
import { api } from '../api'
import { useCarga, useEnvio } from '../hooks'
import { useSesion } from '../context/Sesion'
import { Campo, Cargando, ErrorCarga, Modal } from '../components/ui'
import { PERMISOS, ROLES } from '../../shared/reglas.js'

const NOMBRE_PERMISO = {
  'productos:ver': 'Ver catálogo',
  'productos:editar': 'Crear y editar productos',
  'inventario:ajustar': 'Ajustar inventario',
  'pedidos:ver': 'Ver pedidos',
  'pedidos:estatus': 'Cambiar estatus de pedidos',
  'usuarios:ver': 'Ver usuarios',
  'usuarios:editar': 'Administrar usuarios y roles',
  'bitacora:ver': 'Ver bitácora',
}

export default function Usuarios() {
  const { usuario: yo, puede, avisar, refrescarUsuario } = useSesion()
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.usuarios(), []))
  const [editando, setEditando] = useState(null) // null | 'nuevo' | usuario

  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const guardado = (u, nuevo) => {
    setEditando(null)
    recargar()
    refrescarUsuario(u)
    avisar(nuevo ? `Se creó el usuario ${u.nombre}.` : `Se actualizó a ${u.nombre}.`)
  }

  return (
    <>
      <div className="titulo-fila">
        <div>
          <h1>Usuarios y roles</h1>
          <p className="muted sub">Cada rol tiene un conjunto fijo de permisos. Los cambios quedan en la bitácora.</p>
        </div>
        {puede('usuarios:editar') && (
          <button type="button" className="btn" onClick={() => setEditando('nuevo')}>
            + Nuevo usuario
          </button>
        )}
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              {puede('usuarios:editar') && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {datos.map((u) => (
              <tr key={u.id} className={u.activo ? '' : 'inactivo'}>
                <td>
                  {u.nombre} {u.id === yo.id && <span className="muted">(tú)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`rol rol-${u.rol}`}>{ROLES[u.rol]}</span>
                </td>
                <td>{u.activo ? 'Activo' : 'Desactivado'}</td>
                {puede('usuarios:editar') && (
                  <td>
                    <button type="button" className="btn-link" onClick={() => setEditando(u)}>
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="panel">
        <h2>Matriz de permisos</h2>
        <div className="tabla-scroll">
          <table className="matriz">
            <thead>
              <tr>
                <th scope="col">Permiso</th>
                {Object.entries(ROLES).map(([k, v]) => (
                  <th key={k} scope="col" className="centro">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(NOMBRE_PERMISO).map(([permiso, nombre]) => (
                <tr key={permiso}>
                  <th scope="row">{nombre}</th>
                  {Object.keys(ROLES).map((rol) => (
                    <td key={rol} className="centro">
                      {PERMISOS[rol].includes(permiso) ? <span aria-label="Sí">✓</span> : <span className="muted" aria-label="No">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal abierto={!!editando} titulo={editando === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'} onCerrar={() => setEditando(null)}>
        {editando && (
          <FormUsuario
            usuario={editando === 'nuevo' ? null : editando}
            esYo={editando !== 'nuevo' && editando.id === yo.id}
            onCancelar={() => setEditando(null)}
            onGuardado={(u) => guardado(u, editando === 'nuevo')}
          />
        )}
      </Modal>
    </>
  )
}

function FormUsuario({ usuario, esYo, onCancelar, onGuardado }) {
  const [f, setF] = useState(() => usuario ?? { nombre: '', email: '', rol: '', activo: true })
  const { errores, general, enviando, onSubmit } = useEnvio(
    () => (usuario ? api.actualizarUsuario(usuario.id, f) : api.crearUsuario(f)),
    onGuardado,
  )
  const cambio = (e) => setF({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {general && <p className="aviso aviso-error">{general}</p>}
      <Campo label="Nombre completo" error={errores.nombre}>
        <input name="nombre" value={f.nombre} onChange={cambio} autoComplete="off" />
      </Campo>
      <Campo label="Correo" error={errores.email}>
        <input name="email" type="email" value={f.email} onChange={cambio} autoComplete="off" />
      </Campo>
      <Campo label="Rol" error={errores.rol} ayuda={esYo ? 'No puedes quitarte el rol de administrador.' : undefined}>
        <select name="rol" value={f.rol} onChange={cambio}>
          <option value="">Elige…</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Campo>
      {usuario && (
        <label className="check">
          <input type="checkbox" name="activo" checked={f.activo} onChange={cambio} /> Usuario activo (puede iniciar sesión)
        </label>
      )}
      <div className="form-acciones">
        <button type="button" className="btn btn-sec" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="btn" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
