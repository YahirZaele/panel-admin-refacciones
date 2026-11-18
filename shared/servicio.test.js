import { beforeEach, describe, expect, it } from 'vitest'
import { crearDatosIniciales } from './datos.js'
import { crearServicio, ErrorNegocio } from './servicio.js'
import { siguientesEstatus, validarProducto } from './reglas.js'

let db, svc, admin, almacen, ventas
const reloj = () => '2026-11-17T12:00:00.000Z'

beforeEach(() => {
  db = crearDatosIniciales()
  svc = crearServicio(db, reloj)
  admin = svc.actor(1)
  almacen = svc.actor(2)
  ventas = svc.actor(3)
})

const falla = (fn, status) => {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorNegocio)
    expect(e.status).toBe(status)
    return e
  }
  throw new Error('se esperaba un error')
}

const nuevoProducto = { sku: 'acc-imp-27', nombre: 'Impermeable para moto', categoria: 'Accesorios', precio: '399.5', stock: '10', stockMinimo: '3' }

describe('permisos', () => {
  it('ventas no puede crear productos ni ver usuarios', () => {
    falla(() => svc.crearProducto(ventas, nuevoProducto), 403)
    falla(() => svc.listarUsuarios(ventas), 403)
    falla(() => svc.listarBitacora(almacen), 403)
  })
  it('sin sesión o con usuario inactivo responde 401', () => {
    falla(() => svc.listarProductos(null), 401)
    db.usuarios[3].activo = false
    falla(() => svc.listarProductos(svc.actor(4)), 401)
  })
  it('cada rol solo ve sus transiciones de estatus', () => {
    expect(siguientesEstatus('Pendiente', 'almacen')).toEqual(['Preparando'])
    expect(siguientesEstatus('Pendiente', 'ventas')).toEqual(['Cancelado'])
    expect(siguientesEstatus('Enviado', 'almacen')).toEqual([])
  })
})

describe('productos e inventario', () => {
  it('crea un producto normalizando datos y lo registra en la bitácora', () => {
    const p = svc.crearProducto(admin, nuevoProducto)
    expect(p).toMatchObject({ sku: 'ACC-IMP-27', precio: 399.5, stock: 10, stockMinimo: 3, activo: true })
    expect(db.bitacora[0]).toMatchObject({ accion: 'Producto creado', usuario: 'Andrea Robles', fecha: reloj() })
  })
  it('rechaza SKU duplicado y campos inválidos con errores por campo', () => {
    const e = falla(() => svc.crearProducto(admin, { ...nuevoProducto, sku: 'MOT-BUJ-01', precio: '-5' }), 422)
    expect(e.campos).toHaveProperty('sku')
    expect(e.campos).toHaveProperty('precio')
    expect(validarProducto({ ...nuevoProducto, stockMinimo: '1.5' }).errores).toHaveProperty('stockMinimo')
  })
  it('editar no cambia el stock: solo se mueve con ajustes', () => {
    const p = svc.actualizarProducto(admin, 1, { ...db.productos[0], stock: 999, precio: 199 })
    expect(p.precio).toBe(199)
    expect(p.stock).toBe(40)
  })
  it('los ajustes no dejan stock negativo y exigen motivo', () => {
    falla(() => svc.ajustarStock(almacen, 4, { cantidad: -10, motivo: 'Merma o daño' }), 422)
    falla(() => svc.ajustarStock(almacen, 4, { cantidad: 5, motivo: '' }), 422)
    expect(svc.ajustarStock(almacen, 4, { cantidad: 5, motivo: 'Entrada de proveedor' }).stock).toBe(8)
    expect(db.bitacora[0].detalle).toContain('+5 (3 → 8)')
  })
})

describe('pedidos', () => {
  const pendienteCon = (productoId, cantidad) => {
    const p = db.pedidos.find((x) => x.estatus === 'Pendiente')
    p.items = [{ productoId, sku: 'X', nombre: db.productos[productoId - 1].nombre, cantidad, precio: 100 }]
    return p.folio
  }

  it('preparar descuenta stock y cancelar lo devuelve', () => {
    const folio = pendienteCon(1, 3)
    svc.cambiarEstatus(almacen, folio, 'Preparando')
    expect(db.productos[0].stock).toBe(37)
    svc.cambiarEstatus(admin, folio, 'Cancelado', 'Cliente se arrepintió')
    expect(db.productos[0].stock).toBe(40)
    expect(db.pedidos.find((p) => p.folio === folio).historial.at(-1)).toMatchObject({ estatus: 'Cancelado', nota: 'Cliente se arrepintió' })
  })
  it('no deja preparar sin stock suficiente', () => {
    const folio = pendienteCon(12, 1) // discos de clutch: stock 0
    const e = falla(() => svc.cambiarEstatus(almacen, folio, 'Preparando'), 409)
    expect(e.message).toContain('Discos de clutch')
  })
  it('bloquea transiciones que el rol no tiene', () => {
    const folio = pendienteCon(1, 1)
    falla(() => svc.cambiarEstatus(ventas, folio, 'Preparando'), 409)
    falla(() => svc.cambiarEstatus(almacen, folio, 'Entregado'), 409)
  })
})

describe('usuarios', () => {
  it('crea usuarios y rechaza correos repetidos', () => {
    svc.crearUsuario(admin, { nombre: 'Nueva Persona', email: 'NUEVA@ruta150.demo', rol: 'ventas' })
    falla(() => svc.crearUsuario(admin, { nombre: 'Otra', email: 'nueva@ruta150.demo', rol: 'ventas' }), 422)
  })
  it('un admin no puede quitarse el acceso ni dejar el sistema sin admins', () => {
    falla(() => svc.actualizarUsuario(admin, 1, { ...db.usuarios[0], activo: false }), 409)
    falla(() => svc.actualizarUsuario(admin, 1, { ...db.usuarios[0], rol: 'ventas' }), 409)
  })
  it('cambiar el rol se registra en la bitácora', () => {
    svc.actualizarUsuario(admin, 3, { ...db.usuarios[2], rol: 'almacen' })
    expect(db.bitacora[0].detalle).toContain('rol Ventas → Almacén')
  })
})
