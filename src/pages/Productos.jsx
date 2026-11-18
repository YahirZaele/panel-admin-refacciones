import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { fmtMXN, useCarga, useEnvio } from '../hooks'
import { useSesion } from '../context/Sesion'
import { Campo, Cargando, ErrorCarga, Modal, Paginacion } from '../components/ui'
import { CATEGORIAS, MOTIVOS_AJUSTE, stockBajo } from '../../shared/reglas.js'

const POR_PAGINA = 10
const VACIO = { sku: '', nombre: '', categoria: '', precio: '', stock: '0', stockMinimo: '5' }

export default function Productos() {
  const { puede, avisar } = useSesion()
  const { datos, cargando, error, recargar } = useCarga(useCallback(() => api.productos(), []))
  const [params, setParams] = useSearchParams()
  const [modal, setModal] = useState(null) // { tipo: 'nuevo' | 'editar' | 'ajuste', producto }
  const [orden, setOrden] = useState({ campo: 'sku', dir: 1 })

  const q = params.get('q') ?? ''
  const categoria = params.get('categoria') ?? ''
  const filtro = params.get('filtro') ?? ''
  const pagina = Number(params.get('pagina')) || 1
  const setParam = (k, v) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    if (k !== 'pagina') p.delete('pagina')
    setParams(p, { replace: true })
  }

  const filtrados = useMemo(() => {
    if (!datos) return []
    const t = q.trim().toLowerCase()
    return datos
      .filter((p) => !t || p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t))
      .filter((p) => !categoria || p.categoria === categoria)
      .filter((p) => (filtro === 'bajo' ? stockBajo(p) : filtro === 'inactivos' ? !p.activo : true))
      .sort((a, b) => {
        const va = a[orden.campo]
        const vb = b[orden.campo]
        return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')) * orden.dir
      })
  }, [datos, q, categoria, filtro, orden])

  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} onReintentar={recargar} />

  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const ordenarPor = (campo) => setOrden((o) => ({ campo, dir: o.campo === campo ? -o.dir : 1 }))
  const flecha = (campo) => (orden.campo === campo ? (orden.dir === 1 ? ' ↑' : ' ↓') : '')
  const ariaSort = (campo) => (orden.campo === campo ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none')
  const cerrar = () => setModal(null)
  const listo = (mensaje) => {
    cerrar()
    recargar()
    avisar(mensaje)
  }

  return (
    <>
      <div className="titulo-fila">
        <div>
          <h1>Productos</h1>
          <p className="muted sub">
            {datos.length} productos · {datos.filter(stockBajo).length} con stock bajo
          </p>
        </div>
        {puede('productos:editar') && (
          <button type="button" className="btn" onClick={() => setModal({ tipo: 'nuevo' })}>
            + Nuevo producto
          </button>
        )}
      </div>

      <div className="filtros">
        <label>
          Buscar
          <input type="search" value={q} placeholder="Nombre o SKU" onChange={(e) => setParam('q', e.target.value)} />
        </label>
        <label>
          Categoría
          <select value={categoria} onChange={(e) => setParam('categoria', e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Mostrar
          <select value={filtro} onChange={(e) => setParam('filtro', e.target.value)}>
            <option value="">Todos</option>
            <option value="bajo">Solo stock bajo</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </label>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              {[
                ['sku', 'SKU'],
                ['nombre', 'Producto'],
                ['categoria', 'Categoría'],
                ['precio', 'Precio'],
                ['stock', 'Stock'],
              ].map(([campo, label]) => (
                <th key={campo} scope="col" aria-sort={ariaSort(campo)} className={['precio', 'stock'].includes(campo) ? 'num' : ''}>
                  <button type="button" className="orden" onClick={() => ordenarPor(campo)}>
                    {label}
                    <span aria-hidden="true">{flecha(campo)}</span>
                  </button>
                </th>
              ))}
              <th scope="col">Estado</th>
              {(puede('productos:editar') || puede('inventario:ajustar')) && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="vacio">
                  No hay productos con esos filtros.
                </td>
              </tr>
            )}
            {visibles.map((p) => (
              <tr key={p.id} className={p.activo ? '' : 'inactivo'}>
                <td className="mono">{p.sku}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td className="num">{fmtMXN(p.precio)}</td>
                <td className="num">
                  <span className={`stock ${p.stock === 0 ? 'stock-cero' : stockBajo(p) ? 'stock-bajo' : ''}`}>
                    {p.stock}
                    {stockBajo(p) && <span className="sr-only"> (stock bajo, mínimo {p.stockMinimo})</span>}
                  </span>
                </td>
                <td>{p.activo ? 'Activo' : 'Inactivo'}</td>
                {(puede('productos:editar') || puede('inventario:ajustar')) && (
                  <td className="acciones">
                    {puede('inventario:ajustar') && (
                      <button type="button" className="btn-link" onClick={() => setModal({ tipo: 'ajuste', producto: p })}>
                        Ajustar stock
                      </button>
                    )}
                    {puede('productos:editar') && (
                      <button type="button" className="btn-link" onClick={() => setModal({ tipo: 'editar', producto: p })}>
                        Editar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambiar={(n) => setParam('pagina', String(n))} />

      <Modal abierto={modal?.tipo === 'nuevo' || modal?.tipo === 'editar'} titulo={modal?.tipo === 'nuevo' ? 'Nuevo producto' : 'Editar producto'} onCerrar={cerrar}>
        <FormProducto
          producto={modal?.producto}
          onCancelar={cerrar}
          onGuardado={(p) => listo(modal?.tipo === 'nuevo' ? `Se creó ${p.sku}.` : `Se guardaron los cambios de ${p.sku}.`)}
        />
      </Modal>
      <Modal abierto={modal?.tipo === 'ajuste'} titulo="Ajustar inventario" onCerrar={cerrar}>
        {modal?.producto && <FormAjuste producto={modal.producto} onCancelar={cerrar} onGuardado={(p) => listo(`Stock de ${p.sku}: ${p.stock}.`)} />}
      </Modal>
    </>
  )
}

function FormProducto({ producto, onCancelar, onGuardado }) {
  const nuevo = !producto
  const [f, setF] = useState(() => (producto ? { ...producto, precio: String(producto.precio), stockMinimo: String(producto.stockMinimo) } : VACIO))
  const { errores, general, enviando, onSubmit } = useEnvio(
    () => (nuevo ? api.crearProducto(f) : api.actualizarProducto(producto.id, f)),
    onGuardado,
  )
  const cambio = (e) => setF({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {general && <p className="aviso aviso-error">{general}</p>}
      <div className="form-fila">
        <Campo label="SKU" error={errores.sku} ayuda="Ej. FRE-BAL-05">
          <input name="sku" value={f.sku} onChange={cambio} autoComplete="off" />
        </Campo>
        <Campo label="Categoría" error={errores.categoria}>
          <select name="categoria" value={f.categoria} onChange={cambio}>
            <option value="">Elige…</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo label="Nombre" error={errores.nombre}>
        <input name="nombre" value={f.nombre} onChange={cambio} />
      </Campo>
      <div className="form-fila">
        <Campo label="Precio (MXN)" error={errores.precio}>
          <input name="precio" value={f.precio} onChange={cambio} inputMode="decimal" />
        </Campo>
        {nuevo ? (
          <Campo label="Stock inicial" error={errores.stock}>
            <input name="stock" value={f.stock} onChange={cambio} inputMode="numeric" />
          </Campo>
        ) : (
          <Campo label="Stock actual" ayuda="Se cambia con “Ajustar stock”.">
            <input value={producto.stock} disabled />
          </Campo>
        )}
        <Campo label="Stock mínimo" error={errores.stockMinimo}>
          <input name="stockMinimo" value={f.stockMinimo} onChange={cambio} inputMode="numeric" />
        </Campo>
      </div>
      {!nuevo && (
        <label className="check">
          <input type="checkbox" name="activo" checked={f.activo} onChange={cambio} /> Producto activo (visible en la tienda)
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

function FormAjuste({ producto, onCancelar, onGuardado }) {
  const [f, setF] = useState({ cantidad: '', motivo: '', nota: '' })
  const { errores, general, enviando, onSubmit } = useEnvio(() => api.ajustarStock(producto.id, f), onGuardado)
  const cambio = (e) => setF({ ...f, [e.target.name]: e.target.value })
  const n = Number(f.cantidad)
  const resultado = Number.isInteger(n) && f.cantidad !== '' ? producto.stock + n : null

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <p>
        <strong>{producto.nombre}</strong> <span className="muted mono">{producto.sku}</span>
        <br />
        Stock actual: <strong>{producto.stock}</strong>
        {resultado != null && (
          <>
            {' '}
            → quedaría en <strong className={resultado < 0 ? 'error' : ''}>{resultado}</strong>
          </>
        )}
      </p>
      {general && <p className="aviso aviso-error">{general}</p>}
      <div className="form-fila">
        <Campo label="Cantidad" error={errores.cantidad} ayuda="Positiva suma, negativa resta.">
          <input name="cantidad" value={f.cantidad} onChange={cambio} inputMode="numeric" placeholder="+10 o -2" />
        </Campo>
        <Campo label="Motivo" error={errores.motivo}>
          <select name="motivo" value={f.motivo} onChange={cambio}>
            <option value="">Elige…</option>
            {MOTIVOS_AJUSTE.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo label="Nota (opcional)" error={errores.nota}>
        <input name="nota" value={f.nota} onChange={cambio} maxLength={140} placeholder="Ej. factura 4512 del proveedor" />
      </Campo>
      <div className="form-acciones">
        <button type="button" className="btn btn-sec" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="btn" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Registrar ajuste'}
        </button>
      </div>
    </form>
  )
}
