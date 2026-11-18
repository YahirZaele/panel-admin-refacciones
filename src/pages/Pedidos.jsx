import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { fmtFecha, fmtMXN, useCarga } from '../hooks'
import { useSesion } from '../context/Sesion'
import { Cargando, ErrorCarga, Estatus, Modal } from '../components/ui'
import { ESTATUS, siguientesEstatus } from '../../shared/reglas.js'

export function Pedidos() {
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.pedidos(), []))
  const [params, setParams] = useSearchParams()
  const estatus = params.get('estatus') ?? ''
  const q = params.get('q') ?? ''
  const navegar = useNavigate()

  const setParam = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }

  const filtrados = useMemo(() => {
    if (!datos) return []
    const t = q.trim().toLowerCase()
    return datos.filter((p) => (!estatus || p.estatus === estatus) && (!t || p.folio.toLowerCase().includes(t) || p.cliente.toLowerCase().includes(t)))
  }, [datos, estatus, q])

  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const conteo = (e) => datos.filter((p) => p.estatus === e).length

  return (
    <>
      <h1>Pedidos</h1>
      <p className="muted sub">Haz clic en un pedido para ver su detalle y cambiar su estatus.</p>
      <div className="tabs" role="tablist" aria-label="Filtrar por estatus">
        {['', ...ESTATUS].map((e) => (
          <button key={e || 'todos'} type="button" role="tab" aria-selected={estatus === e} className={estatus === e ? 'on' : ''} onClick={() => setParam('estatus', e)}>
            {e || 'Todos'} <span className="contador">{e ? conteo(e) : datos.length}</span>
          </button>
        ))}
      </div>
      <div className="filtros">
        <label>
          Buscar
          <input type="search" value={q} placeholder="Folio o cliente" onChange={(e) => setParam('q', e.target.value)} />
        </label>
      </div>
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Folio</th>
              <th scope="col">Fecha</th>
              <th scope="col">Cliente</th>
              <th scope="col">Canal</th>
              <th scope="col" className="num">Total</th>
              <th scope="col">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="vacio">
                  No hay pedidos con esos filtros.
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.folio} className="fila-click" onClick={() => navegar(`/pedidos/${p.folio}`)}>
                <td>
                  <Link to={`/pedidos/${p.folio}`} onClick={(e) => e.stopPropagation()} className="mono">
                    {p.folio}
                  </Link>
                </td>
                <td>{fmtFecha(p.fecha, false)}</td>
                <td>{p.cliente}</td>
                <td>{p.canal}</td>
                <td className="num">{fmtMXN(p.total)}</td>
                <td>
                  <Estatus valor={p.estatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function PedidoDetalle() {
  const { folio } = useParams()
  const { usuario, avisar } = useSesion()
  const { datos: p, cargando, error, recargar } = useCarga(useCallback(() => api.pedido(folio), [folio]))
  const [destino, setDestino] = useState(null)
  const [nota, setNota] = useState('')
  const [fallo, setFallo] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (cargando && !p) return <Cargando />
  if (error) {
    return (
      <>
        <ErrorCarga error={error} onReintentar={error.status === 404 ? null : recargar} />
        <Link to="/pedidos">← Volver a pedidos</Link>
      </>
    )
  }

  const opciones = siguientesEstatus(p.estatus, usuario.rol)

  async function confirmar(e) {
    e.preventDefault()
    setEnviando(true)
    setFallo('')
    try {
      await api.cambiarEstatus(p.folio, destino, nota)
      setDestino(null)
      setNota('')
      recargar()
      avisar(`${p.folio} pasó a ${destino}.`)
    } catch (err) {
      setFallo(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Link to="/pedidos" className="volver">
        ← Pedidos
      </Link>
      <div className="titulo-fila">
        <div>
          <h1>
            Pedido <span className="mono">{p.folio}</span>
          </h1>
          <p className="muted sub">
            {p.cliente} · {p.canal} · {fmtFecha(p.fecha)}
          </p>
        </div>
        <Estatus valor={p.estatus} />
      </div>

      <div className="columnas">
        <section className="panel">
          <h2>Artículos</h2>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" className="num">Cant.</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col" className="num">Importe</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((it) => (
                  <tr key={it.productoId}>
                    <td>
                      {it.nombre}
                      <br />
                      <small className="muted mono">{it.sku}</small>
                    </td>
                    <td className="num">{it.cantidad}</td>
                    <td className="num">{fmtMXN(it.precio)}</td>
                    <td className="num">{fmtMXN(it.precio * it.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Total
                  </th>
                  <td className="num">
                    <strong>{fmtMXN(p.total)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Acciones</h2>
          {opciones.length === 0 ? (
            <p className="muted">
              {['Entregado', 'Cancelado'].includes(p.estatus)
                ? 'Este pedido ya está cerrado.'
                : 'Tu rol no puede mover este pedido en su estatus actual.'}
            </p>
          ) : (
            <div className="row">
              {opciones.map((o) => (
                <button key={o} type="button" className={o === 'Cancelado' ? 'btn btn-peligro' : 'btn'} onClick={() => setDestino(o)}>
                  {o === 'Cancelado' ? 'Cancelar pedido' : `Pasar a “${o}”`}
                </button>
              ))}
            </div>
          )}
          {p.estatus === 'Pendiente' && opciones.includes('Preparando') && (
            <p className="small muted">Al pasar a “Preparando” se descuenta el inventario de cada artículo.</p>
          )}

          <h2 className="h2-sep">Historial</h2>
          <ol className="timeline">
            {p.historial.map((h, i) => (
              <li key={i}>
                <Estatus valor={h.estatus} />
                <span>
                  {fmtFecha(h.fecha)} · {h.usuario}
                  {h.nota && <em> — {h.nota}</em>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Modal abierto={!!destino} titulo={destino === 'Cancelado' ? 'Cancelar pedido' : `Pasar a “${destino}”`} onCerrar={() => setDestino(null)}>
        <form className="form" onSubmit={confirmar}>
          <p>
            ¿Confirmas el cambio de <strong>{p.estatus}</strong> a <strong>{destino}</strong> del pedido {p.folio}?
          </p>
          {fallo && <p className="aviso aviso-error">{fallo}</p>}
          <label className="campo">
            <span>Nota (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={140} placeholder={destino === 'Enviado' ? 'Ej. guía 7781 de paquetería' : ''} />
          </label>
          <div className="form-acciones">
            <button type="button" className="btn btn-sec" onClick={() => setDestino(null)}>
              Volver
            </button>
            <button className={destino === 'Cancelado' ? 'btn btn-peligro' : 'btn'} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
