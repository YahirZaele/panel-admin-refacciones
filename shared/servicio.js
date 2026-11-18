// Lógica de negocio del panel. Funciona sobre un objeto "db" en memoria y no sabe nada de HTTP
// ni de React: la usan igual la API de Express (server/) y la demo en el navegador (src/api/mock.js).
import {
  puede,
  siguientesEstatus,
  stockBajo,
  validarAjuste,
  validarProducto,
  validarStockInicial,
  validarUsuario,
  ROLES,
} from './reglas.js'

export class ErrorNegocio extends Error {
  constructor(status, mensaje, campos) {
    super(mensaje)
    this.status = status
    this.campos = campos
  }
}

const copia = (v) => JSON.parse(JSON.stringify(v))

export function crearServicio(db, reloj = () => new Date().toISOString()) {
  function exigir(actor, permiso) {
    if (!actor || !actor.activo) throw new ErrorNegocio(401, 'Tu sesión no es válida. Vuelve a entrar.')
    if (permiso && !puede(actor.rol, permiso)) throw new ErrorNegocio(403, 'Tu rol no tiene permiso para esta acción.')
  }
  function siHayErrores(errores) {
    if (Object.keys(errores).length > 0) throw new ErrorNegocio(422, 'Revisa los campos marcados.', errores)
  }
  function registrar(actor, accion, detalle) {
    db.seq.bitacora += 1
    db.bitacora.unshift({ id: db.seq.bitacora, fecha: reloj(), usuarioId: actor.id, usuario: actor.nombre, rol: actor.rol, accion, detalle })
  }
  function producto(id) {
    const p = db.productos.find((x) => x.id === Number(id))
    if (!p) throw new ErrorNegocio(404, 'El producto no existe.')
    return p
  }
  function pedido(folio) {
    const p = db.pedidos.find((x) => x.folio === folio)
    if (!p) throw new ErrorNegocio(404, 'El pedido no existe.')
    return p
  }

  return {
    actor(id) {
      return db.usuarios.find((u) => u.id === Number(id)) ?? null
    },

    usuariosDemo() {
      return copia(db.usuarios.filter((u) => u.activo))
    },

    resumen(actor) {
      exigir(actor)
      const porEstatus = Object.fromEntries(['Pendiente', 'Preparando', 'Enviado'].map((e) => [e, db.pedidos.filter((p) => p.estatus === e).length]))
      const entregados = db.pedidos.filter((p) => p.estatus === 'Entregado')
      return copia({
        porEstatus,
        ventasEntregadas: entregados.reduce((s, p) => s + p.total, 0),
        pedidosEntregados: entregados.length,
        stockBajo: db.productos.filter(stockBajo).sort((a, b) => a.stock - b.stock),
        porAtender: db.pedidos
          .filter((p) => siguientesEstatus(p.estatus, actor.rol).length > 0)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .slice(0, 6),
        actividad: puede(actor.rol, 'bitacora:ver') ? db.bitacora.slice(0, 5) : [],
      })
    },

    // ---- Productos e inventario ----
    listarProductos(actor) {
      exigir(actor, 'productos:ver')
      return copia(db.productos)
    },

    crearProducto(actor, entrada) {
      exigir(actor, 'productos:editar')
      const { datos, errores } = validarProducto(entrada)
      const errStock = validarStockInicial(entrada.stock)
      if (errStock) errores.stock = errStock
      if (!errores.sku && db.productos.some((p) => p.sku === datos.sku)) errores.sku = 'Ya existe un producto con ese SKU.'
      siHayErrores(errores)
      db.seq.producto += 1
      const nuevo = { id: db.seq.producto, ...datos, stock: Number(entrada.stock), activo: true }
      db.productos.push(nuevo)
      registrar(actor, 'Producto creado', `${nuevo.sku} · ${nuevo.nombre} (stock inicial ${nuevo.stock})`)
      return copia(nuevo)
    },

    actualizarProducto(actor, id, entrada) {
      exigir(actor, 'productos:editar')
      const p = producto(id)
      const { datos, errores } = validarProducto(entrada)
      if (!errores.sku && db.productos.some((x) => x.sku === datos.sku && x.id !== p.id)) errores.sku = 'Ya existe un producto con ese SKU.'
      siHayErrores(errores)
      const activo = entrada.activo === undefined ? p.activo : Boolean(entrada.activo)
      const cambios = Object.entries({ ...datos, activo })
        .filter(([k, v]) => p[k] !== v)
        .map(([k, v]) => `${k}: ${p[k]} → ${v}`)
      if (cambios.length === 0) return copia(p)
      Object.assign(p, datos, { activo })
      registrar(actor, activo === false && cambios.some((c) => c.startsWith('activo')) ? 'Producto desactivado' : 'Producto editado', `${p.sku} · ${cambios.join('; ')}`)
      return copia(p)
    },

    ajustarStock(actor, id, entrada) {
      exigir(actor, 'inventario:ajustar')
      const p = producto(id)
      const { datos, errores } = validarAjuste(entrada, p.stock)
      siHayErrores(errores)
      const antes = p.stock
      p.stock += datos.cantidad
      const signo = datos.cantidad > 0 ? '+' : ''
      registrar(actor, 'Ajuste de inventario', `${p.sku} · ${signo}${datos.cantidad} (${antes} → ${p.stock}) · ${datos.motivo}${datos.nota ? ` · ${datos.nota}` : ''}`)
      return copia(p)
    },

    // ---- Pedidos ----
    listarPedidos(actor) {
      exigir(actor, 'pedidos:ver')
      return copia(db.pedidos).sort((a, b) => b.fecha.localeCompare(a.fecha))
    },

    obtenerPedido(actor, folio) {
      exigir(actor, 'pedidos:ver')
      return copia(pedido(folio))
    },

    cambiarEstatus(actor, folio, nuevo, nota = '') {
      exigir(actor, 'pedidos:estatus')
      const p = pedido(folio)
      if (!siguientesEstatus(p.estatus, actor.rol).includes(nuevo)) {
        throw new ErrorNegocio(409, `Tu rol no puede pasar un pedido de "${p.estatus}" a "${nuevo}".`)
      }
      // Al empezar a prepararlo se aparta el inventario; si se cancela ya apartado, se devuelve.
      if (nuevo === 'Preparando') {
        const faltantes = p.items.filter((it) => producto(it.productoId).stock < it.cantidad)
        if (faltantes.length > 0) {
          throw new ErrorNegocio(409, `No hay stock suficiente de: ${faltantes.map((f) => f.nombre).join(', ')}.`)
        }
        p.items.forEach((it) => (producto(it.productoId).stock -= it.cantidad))
      }
      if (nuevo === 'Cancelado' && p.estatus === 'Preparando') {
        p.items.forEach((it) => (producto(it.productoId).stock += it.cantidad))
      }
      const anterior = p.estatus
      p.estatus = nuevo
      p.historial.push({ estatus: nuevo, fecha: reloj(), usuario: actor.nombre, nota: String(nota).trim().slice(0, 140) })
      registrar(actor, 'Estatus de pedido', `${p.folio} · ${anterior} → ${nuevo}`)
      return copia(p)
    },

    // ---- Usuarios y permisos ----
    listarUsuarios(actor) {
      exigir(actor, 'usuarios:ver')
      return copia(db.usuarios)
    },

    crearUsuario(actor, entrada) {
      exigir(actor, 'usuarios:editar')
      const { datos, errores } = validarUsuario(entrada)
      if (!errores.email && db.usuarios.some((u) => u.email === datos.email)) errores.email = 'Ese correo ya está registrado.'
      siHayErrores(errores)
      db.seq.usuario += 1
      const nuevo = { id: db.seq.usuario, ...datos, activo: true }
      db.usuarios.push(nuevo)
      registrar(actor, 'Usuario creado', `${nuevo.nombre} · rol ${ROLES[nuevo.rol]}`)
      return copia(nuevo)
    },

    actualizarUsuario(actor, id, entrada) {
      exigir(actor, 'usuarios:editar')
      const u = db.usuarios.find((x) => x.id === Number(id))
      if (!u) throw new ErrorNegocio(404, 'El usuario no existe.')
      const { datos, errores } = validarUsuario(entrada)
      if (!errores.email && db.usuarios.some((x) => x.email === datos.email && x.id !== u.id)) errores.email = 'Ese correo ya está registrado.'
      siHayErrores(errores)
      const activo = entrada.activo === undefined ? u.activo : Boolean(entrada.activo)
      if (u.id === actor.id && (!activo || datos.rol !== 'admin')) {
        throw new ErrorNegocio(409, 'No puedes quitarte tu propio acceso de administrador.')
      }
      const quedanAdmins = db.usuarios.filter((x) => x.id !== u.id && x.activo && x.rol === 'admin').length
      if (u.rol === 'admin' && u.activo && (!activo || datos.rol !== 'admin') && quedanAdmins === 0) {
        throw new ErrorNegocio(409, 'Debe quedar al menos un administrador activo.')
      }
      const cambios = []
      if (u.rol !== datos.rol) cambios.push(`rol ${ROLES[u.rol]} → ${ROLES[datos.rol]}`)
      if (u.activo !== activo) cambios.push(activo ? 'reactivado' : 'desactivado')
      if (u.nombre !== datos.nombre) cambios.push(`nombre → ${datos.nombre}`)
      if (u.email !== datos.email) cambios.push(`correo → ${datos.email}`)
      Object.assign(u, datos, { activo })
      if (cambios.length) registrar(actor, 'Usuario editado', `${u.nombre} · ${cambios.join('; ')}`)
      return copia(u)
    },

    listarBitacora(actor) {
      exigir(actor, 'bitacora:ver')
      return copia(db.bitacora)
    },
  }
}
