// Datos iniciales ficticios del panel. Se generan con semilla fija: siempre son los mismos.

const PRODUCTOS = [
  ['MOT-BUJ-01', 'Bujía de iridio', 'Motor', 189, 40, 10],
  ['MOT-KIT-02', 'Kit de pistón y anillos 150cc', 'Motor', 749, 12, 4],
  ['MOT-JUN-03', 'Juego de juntas de motor', 'Motor', 329, 25, 6],
  ['MOT-CAD-04', 'Cadena de distribución', 'Motor', 259, 3, 5],
  ['FRE-BAL-05', 'Balatas delanteras de disco', 'Frenos', 219, 50, 12],
  ['FRE-ZAP-06', 'Zapatas de freno trasero', 'Frenos', 169, 35, 10],
  ['FRE-DIS-07', 'Disco de freno delantero', 'Frenos', 689, 8, 3],
  ['FRE-LIQ-08', 'Líquido de frenos DOT 4 (250 ml)', 'Frenos', 99, 60, 15],
  ['TRA-KIT-09', 'Kit de arrastre (cadena, piñón y catarina)', 'Transmisión', 899, 15, 5],
  ['TRA-KIT-10', 'Kit de arrastre reforzado 520', 'Transmisión', 1349, 2, 3],
  ['TRA-CLU-11', 'Cable de clutch', 'Transmisión', 129, 30, 8],
  ['TRA-DIS-12', 'Discos de clutch (juego)', 'Transmisión', 449, 0, 4],
  ['ELE-BAT-13', 'Batería de gel 12V 5Ah', 'Eléctrico', 699, 20, 6],
  ['ELE-BAT-14', 'Batería de gel 12V 7Ah', 'Eléctrico', 899, 10, 4],
  ['ELE-FAR-15', 'Faro LED delantero', 'Eléctrico', 549, 14, 4],
  ['ELE-DIR-16', 'Direccionales LED (par)', 'Eléctrico', 229, 28, 8],
  ['LLA-DEL-17', 'Llanta delantera 2.75-18', 'Llantas', 799, 9, 4],
  ['LLA-TRA-18', 'Llanta trasera 90/90-18', 'Llantas', 949, 4, 4],
  ['LLA-DEP-19', 'Llanta deportiva 140/70-17', 'Llantas', 1599, 4, 2],
  ['ACE-MOT-20', 'Aceite 4T 20W-50 (1 L)', 'Aceites y filtros', 149, 80, 24],
  ['ACE-SIN-21', 'Aceite sintético 10W-40 (1 L)', 'Aceites y filtros', 249, 45, 12],
  ['ACE-FIL-22', 'Filtro de aceite', 'Aceites y filtros', 89, 55, 15],
  ['ACE-AIR-23', 'Filtro de aire', 'Aceites y filtros', 119, 6, 8],
  ['ACC-CAS-24', 'Casco abatible certificado', 'Accesorios', 1299, 11, 3],
  ['ACC-GUA-25', 'Guantes de protección', 'Accesorios', 349, 22, 6],
  ['ACC-CAN-26', 'Candado de disco con alarma', 'Accesorios', 459, 16, 4],
]

const USUARIOS = [
  ['Andrea Robles', 'andrea.robles@ruta150.demo', 'admin'],
  ['Luis Hernández', 'luis.hernandez@ruta150.demo', 'almacen'],
  ['Mariana Soto', 'mariana.soto@ruta150.demo', 'ventas'],
  ['Jorge Pérez', 'jorge.perez@ruta150.demo', 'almacen'],
]

const CLIENTES = ['Carlos Mendoza', 'Ana Ruiz', 'Taller El Pistón', 'Fernanda Gómez', 'Moto Express Doctores', 'Ricardo Lara', 'Paola Jiménez', 'Taller Hermanos Ortiz', 'Iván Castillo', 'Sofía Navarro']
const CANALES = ['Tienda en línea', 'Mostrador', 'WhatsApp']

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function crearDatosIniciales() {
  const rnd = mulberry32(150)
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

  const productos = PRODUCTOS.map(([sku, nombre, categoria, precio, stock, stockMinimo], i) => ({
    id: i + 1,
    sku,
    nombre,
    categoria,
    precio,
    stock,
    stockMinimo,
    activo: true,
  }))

  const usuarios = USUARIOS.map(([nombre, email, rol], i) => ({ id: i + 1, nombre, email, rol, activo: true }))

  // 24 pedidos del 1 al 17 de noviembre de 2026; los más recientes siguen abiertos.
  const pedidos = []
  for (let i = 0; i < 24; i++) {
    const dia = 1 + Math.floor((i * 17) / 24)
    const fecha = `2026-11-${String(dia).padStart(2, '0')}T${String(9 + Math.floor(rnd() * 9)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00.000Z`
    const items = []
    const n = 1 + Math.floor(rnd() * 3)
    for (let k = 0; k < n; k++) {
      const p = pick(productos)
      if (items.some((it) => it.productoId === p.id)) continue
      items.push({ productoId: p.id, sku: p.sku, nombre: p.nombre, cantidad: 1 + Math.floor(rnd() * 2), precio: p.precio })
    }
    let estatus
    if (i < 14) estatus = rnd() < 0.12 ? 'Cancelado' : 'Entregado'
    else if (i < 18) estatus = 'Enviado'
    else if (i < 20) estatus = 'Preparando'
    else estatus = 'Pendiente'
    pedidos.push({
      folio: `R150-${String(2601 + i)}`,
      fecha,
      cliente: pick(CLIENTES),
      canal: pick(CANALES),
      items,
      total: items.reduce((s, it) => s + it.cantidad * it.precio, 0),
      estatus,
      historial: [{ estatus: 'Pendiente', fecha, usuario: 'Sistema', nota: 'Pedido recibido' }],
    })
  }

  return {
    productos,
    usuarios,
    pedidos,
    bitacora: [],
    seq: { producto: productos.length, usuario: usuarios.length, bitacora: 0 },
  }
}
