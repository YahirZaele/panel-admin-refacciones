import { useCallback, useMemo, useState } from 'react'
import { api } from '../api'
import { fmtFecha, useCarga } from '../hooks'
import { Cargando, ErrorCarga } from '../components/ui'
import { ROLES } from '../../shared/reglas.js'

// Bitácora de auditoría: quién cambió qué y cuándo. Es solo de lectura.
export default function Bitacora() {
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.bitacora(), []))
  const [accion, setAccion] = useState('')
  const [usuario, setUsuario] = useState('')

  const acciones = useMemo(() => [...new Set((datos ?? []).map((b) => b.accion))].sort(), [datos])
  const usuarios = useMemo(() => [...new Set((datos ?? []).map((b) => b.usuario))].sort(), [datos])

  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const filtradas = datos.filter((b) => (!accion || b.accion === accion) && (!usuario || b.usuario === usuario))

  return (
    <>
      <h1>Bitácora</h1>
      <p className="muted sub">Registro de auditoría de todos los cambios hechos en el panel, del más reciente al más antiguo.</p>
      {datos.length === 0 ? (
        <div className="panel">
          <p>Todavía no hay cambios registrados.</p>
          <p className="muted">Edita un producto, ajusta inventario o cambia el estatus de un pedido y aparecerá aquí.</p>
        </div>
      ) : (
        <>
          <div className="filtros">
            <label>
              Acción
              <select value={accion} onChange={(e) => setAccion(e.target.value)}>
                <option value="">Todas</option>
                {acciones.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label>
              Usuario
              <select value={usuario} onChange={(e) => setUsuario(e.target.value)}>
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((b) => (
                  <tr key={b.id}>
                    <td className="nowrap">{fmtFecha(b.fecha)}</td>
                    <td>
                      {b.usuario}
                      <br />
                      <small className="muted">{ROLES[b.rol]}</small>
                    </td>
                    <td>{b.accion}</td>
                    <td>{b.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
