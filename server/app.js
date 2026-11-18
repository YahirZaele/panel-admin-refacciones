// API REST del panel con Express. Usa la misma lógica de negocio que la demo (shared/servicio.js).
// Autenticación simplificada para la demo: el cliente manda el id de usuario en el encabezado
// "X-Usuario-Id". En producción se usaría un login con contraseña (bcrypt) y un token JWT.
import express from 'express'
import { crearDatosIniciales } from '../shared/datos.js'
import { crearServicio, ErrorNegocio } from '../shared/servicio.js'

export function crearApp({ origenPermitido = 'http://localhost:5173' } = {}) {
  let db = crearDatosIniciales()
  let svc = crearServicio(db)

  const app = express()
  app.use(express.json({ limit: '50kb' }))

  // CORS mínimo para el servidor de desarrollo de Vite.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', origenPermitido)
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Usuario-Id')
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // Identifica al usuario de la petición (las reglas de permisos se aplican en el servicio).
  app.use((req, _res, next) => {
    req.actor = svc.actor(req.get('X-Usuario-Id'))
    next()
  })

  // Envuelve cada handler: responde JSON y traduce ErrorNegocio a su código HTTP.
  const ruta = (fn, status = 200) => (req, res, next) => {
    try {
      res.status(status).json(fn(req))
    } catch (e) {
      next(e)
    }
  }

  const r = express.Router()
  r.get('/usuarios-demo', ruta(() => svc.usuariosDemo()))
  r.get('/resumen', ruta((req) => svc.resumen(req.actor)))

  r.get('/productos', ruta((req) => svc.listarProductos(req.actor)))
  r.post('/productos', ruta((req) => svc.crearProducto(req.actor, req.body ?? {}), 201))
  r.put('/productos/:id', ruta((req) => svc.actualizarProducto(req.actor, req.params.id, req.body ?? {})))
  r.post('/productos/:id/ajustes', ruta((req) => svc.ajustarStock(req.actor, req.params.id, req.body ?? {})))

  r.get('/pedidos', ruta((req) => svc.listarPedidos(req.actor)))
  r.get('/pedidos/:folio', ruta((req) => svc.obtenerPedido(req.actor, req.params.folio)))
  r.post('/pedidos/:folio/estatus', ruta((req) => svc.cambiarEstatus(req.actor, req.params.folio, req.body?.estatus, req.body?.nota)))

  r.get('/usuarios', ruta((req) => svc.listarUsuarios(req.actor)))
  r.post('/usuarios', ruta((req) => svc.crearUsuario(req.actor, req.body ?? {}), 201))
  r.put('/usuarios/:id', ruta((req) => svc.actualizarUsuario(req.actor, req.params.id, req.body ?? {})))

  r.get('/bitacora', ruta((req) => svc.listarBitacora(req.actor)))

  r.post('/reiniciar', (_req, res) => {
    db = crearDatosIniciales()
    svc = crearServicio(db)
    res.status(204).end()
  })

  app.use('/api', r)
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }))

  // Manejador de errores: errores de negocio con su código; cualquier otro, 500 sin detalles internos.
  app.use((err, _req, res, _next) => {
    if (err instanceof ErrorNegocio) return res.status(err.status).json({ error: err.message, campos: err.campos })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo no es JSON válido.' })
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  })

  return app
}
