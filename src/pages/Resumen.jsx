import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { fmtFecha, fmtMXN, useCarga } from '../hooks'
import { useSesion } from '../context/Sesion'
import { Cargando, ErrorCarga, Estatus } from '../components/ui'

export default function Resumen() {
  const { usuario, puede } = useSesion()
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.resumen(), []))

  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const d = datos
  return (
    <>
      <h1>Hola, {usuario.nombre.split(' ')[0]}</h1>
      <p className="muted sub">Esto es lo que necesita atención hoy.</p>

      <section className="tarjetas" aria-label="Indicadores">
        <Link to="/pedidos?estatus=Pendiente" className="tarjeta">
          <span>Pedidos pendientes</span>
          <strong>{d.porEstatus.Pendiente}</strong>
        </Link>
        <Link to="/pedidos?estatus=Preparando" className="tarjeta">
          <span>En preparación</span>
          <strong>{d.porEstatus.Preparando}</strong>
        </Link>
        <Link to="/pedidos?estatus=Enviado" className="tarjeta">
          <span>Enviados</span>
          <strong>{d.porEstatus.Enviado}</strong>
        </Link>
        <Link to="/productos?filtro=bajo" className={`tarjeta ${d.stockBajo.length ? 'tarjeta-alerta' : ''}`}>
          <span>Productos con stock bajo</span>
          <strong>{d.stockBajo.length}</strong>
        </Link>
      </section>

      <div className="columnas">
        <section className="panel">
          <h2>Pedidos que puedes atender</h2>
          {d.porAtender.length === 0 ? (
            <p className="muted">No hay pedidos esperando una acción de tu rol.</p>
          ) : (
            <ul className="lista">
              {d.porAtender.map((p) => (
                <li key={p.folio}>
                  <Link to={`/pedidos/${p.folio}`}>{p.folio}</Link>
                  <span className="muted">{p.cliente}</span>
                  <Estatus valor={p.estatus} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Stock bajo</h2>
          {d.stockBajo.length === 0 ? (
            <p className="muted">Todo el inventario está por encima del mínimo.</p>
          ) : (
            <ul className="lista">
              {d.stockBajo.map((p) => (
                <li key={p.id}>
                  <span>{p.nombre}</span>
                  <span className="muted small">{p.sku}</span>
                  <span className={`stock ${p.stock === 0 ? 'stock-cero' : 'stock-bajo'}`}>
                    {p.stock === 0 ? 'Agotado' : `${p.stock} / mín. ${p.stockMinimo}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Ventas entregadas (noviembre)</h2>
        <p>
          <strong className="cifra">{fmtMXN(d.ventasEntregadas)}</strong>{' '}
          <span className="muted">en {d.pedidosEntregados} pedidos entregados</span>
        </p>
      </section>

      {puede('bitacora:ver') && (
        <section className="panel">
          <h2>Actividad reciente</h2>
          {d.actividad.length === 0 ? (
            <p className="muted">Todavía no hay cambios registrados. Prueba editar un producto o mover un pedido.</p>
          ) : (
            <ul className="lista">
              {d.actividad.map((b) => (
                <li key={b.id}>
                  <span>
                    <strong>{b.usuario}</strong> · {b.accion}
                  </span>
                  <span className="muted small">{b.detalle}</span>
                  <span className="muted small">{fmtFecha(b.fecha)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/bitacora">Ver bitácora completa</Link>
        </section>
      )}
    </>
  )
}
