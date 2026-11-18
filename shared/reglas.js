// Roles, permisos, flujo de estatus y validaciones.
// Este archivo lo usan tanto el frontend (demo) como la API de Express: una sola fuente de reglas.

export const ROLES = {
  admin: 'Administrador',
  almacen: 'Almacén',
  ventas: 'Ventas',
}

export const PERMISOS = {
  admin: ['productos:ver', 'productos:editar', 'inventario:ajustar', 'pedidos:ver', 'pedidos:estatus', 'usuarios:ver', 'usuarios:editar', 'bitacora:ver'],
  almacen: ['productos:ver', 'inventario:ajustar', 'pedidos:ver', 'pedidos:estatus'],
  ventas: ['productos:ver', 'pedidos:ver', 'pedidos:estatus'],
}

export const puede = (rol, permiso) => (PERMISOS[rol] ?? []).includes(permiso)

export const CATEGORIAS = ['Motor', 'Frenos', 'Transmisión', 'Eléctrico', 'Llantas', 'Aceites y filtros', 'Accesorios']

export const ESTATUS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado']

// Qué roles pueden mover un pedido de un estatus a otro.
export const TRANSICIONES = {
  Pendiente: { Preparando: ['admin', 'almacen'], Cancelado: ['admin', 'ventas'] },
  Preparando: { Enviado: ['admin', 'almacen'], Cancelado: ['admin'] },
  Enviado: { Entregado: ['admin', 'ventas'] },
  Entregado: {},
  Cancelado: {},
}

export function siguientesEstatus(estatus, rol) {
  return Object.entries(TRANSICIONES[estatus] ?? {})
    .filter(([, roles]) => roles.includes(rol))
    .map(([destino]) => destino)
}

export const MOTIVOS_AJUSTE = ['Entrada de proveedor', 'Conteo físico', 'Merma o daño', 'Devolución de cliente']

const texto = (v) => (typeof v === 'string' ? v.trim() : '')
const esEntero = (v) => Number.isInteger(Number(v)) && String(v).trim() !== ''

// Cada validador devuelve { datos, errores }: datos ya normalizados y errores por campo.
export function validarProducto(entrada) {
  const errores = {}
  const datos = {
    sku: texto(entrada.sku).toUpperCase(),
    nombre: texto(entrada.nombre),
    categoria: texto(entrada.categoria),
    precio: Number(entrada.precio),
    stockMinimo: Number(entrada.stockMinimo),
  }
  if (!/^[A-Z]{3}-[A-Z]{3}-\d{2,3}$/.test(datos.sku)) errores.sku = 'Formato AAA-AAA-00 (por ejemplo FRE-BAL-05).'
  if (datos.nombre.length < 3 || datos.nombre.length > 80) errores.nombre = 'Entre 3 y 80 caracteres.'
  if (!CATEGORIAS.includes(datos.categoria)) errores.categoria = 'Elige una categoría.'
  if (!(datos.precio > 0) || datos.precio > 100000) errores.precio = 'Precio mayor a 0 y hasta $100,000.'
  else datos.precio = Math.round(datos.precio * 100) / 100
  if (!esEntero(entrada.stockMinimo) || datos.stockMinimo < 0) errores.stockMinimo = 'Número entero de 0 en adelante.'
  return { datos, errores }
}

export function validarStockInicial(valor) {
  return esEntero(valor) && Number(valor) >= 0 ? null : 'Número entero de 0 en adelante.'
}

export function validarAjuste(entrada, stockActual) {
  const errores = {}
  const datos = { cantidad: Number(entrada.cantidad), motivo: texto(entrada.motivo), nota: texto(entrada.nota) }
  if (!esEntero(entrada.cantidad) || datos.cantidad === 0) errores.cantidad = 'Entero distinto de 0 (negativo para restar).'
  else if (stockActual + datos.cantidad < 0) errores.cantidad = `El stock no puede quedar negativo (hay ${stockActual}).`
  if (!MOTIVOS_AJUSTE.includes(datos.motivo)) errores.motivo = 'Elige un motivo.'
  if (datos.nota.length > 140) errores.nota = 'Máximo 140 caracteres.'
  return { datos, errores }
}

export function validarUsuario(entrada) {
  const errores = {}
  const datos = { nombre: texto(entrada.nombre), email: texto(entrada.email).toLowerCase(), rol: texto(entrada.rol) }
  if (datos.nombre.length < 3) errores.nombre = 'Escribe nombre y apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) errores.email = 'Correo no válido.'
  if (!ROLES[datos.rol]) errores.rol = 'Elige un rol.'
  return { datos, errores }
}

export const stockBajo = (p) => p.activo && p.stock <= p.stockMinimo
