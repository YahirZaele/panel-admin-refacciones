// API simulada para la demo estática: corre la misma lógica de negocio que el servidor
// (shared/servicio.js) sobre datos guardados en localStorage, con una pequeña latencia
// para que los estados de "cargando" se vean como con un servidor real.
import { crearDatosIniciales } from '../../shared/datos.js'
import { crearServicio, ErrorNegocio } from '../../shared/servicio.js'

const CLAVE = 'panel150:db:v1'

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return JSON.parse(guardado)
  } catch {
    // almacenamiento no disponible o dañado: se empieza con datos nuevos
  }
  return crearDatosIniciales()
}

export function crearApiDemo(ApiError) {
  let db = cargar()
  let svc = crearServicio(db)
  let usuarioId = null

  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(db))
    } catch {
      // sin persistencia: la demo sigue funcionando en memoria
    }
  }
  const esperar = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180))

  // Ejecuta una operación del servicio como si fuera una petición HTTP.
  const llamar = (fn, { escribe = false } = {}) =>
    esperar().then(() => {
      try {
        const resultado = fn(svc.actor(usuarioId))
        if (escribe) guardar()
        return resultado
      } catch (e) {
        if (e instanceof ErrorNegocio) throw new ApiError(e.status, e.message, e.campos)
        throw e
      }
    })

  return {
    setSesion: (id) => (usuarioId = id),
    usuariosDemo: () => llamar(() => svc.usuariosDemo()),
    resumen: () => llamar((a) => svc.resumen(a)),
    productos: () => llamar((a) => svc.listarProductos(a)),
    crearProducto: (d) => llamar((a) => svc.crearProducto(a, d), { escribe: true }),
    actualizarProducto: (id, d) => llamar((a) => svc.actualizarProducto(a, id, d), { escribe: true }),
    ajustarStock: (id, d) => llamar((a) => svc.ajustarStock(a, id, d), { escribe: true }),
    pedidos: () => llamar((a) => svc.listarPedidos(a)),
    pedido: (folio) => llamar((a) => svc.obtenerPedido(a, folio)),
    cambiarEstatus: (folio, estatus, nota) => llamar((a) => svc.cambiarEstatus(a, folio, estatus, nota), { escribe: true }),
    usuarios: () => llamar((a) => svc.listarUsuarios(a)),
    crearUsuario: (d) => llamar((a) => svc.crearUsuario(a, d), { escribe: true }),
    actualizarUsuario: (id, d) => llamar((a) => svc.actualizarUsuario(a, id, d), { escribe: true }),
    bitacora: () => llamar((a) => svc.listarBitacora(a)),
    reiniciar: () =>
      esperar().then(() => {
        db = crearDatosIniciales()
        svc = crearServicio(db)
        guardar()
        return null
      }),
  }
}
