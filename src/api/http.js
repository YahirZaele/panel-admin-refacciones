// Cliente de la API REST (server/app.js).
export function crearApiHttp(base, ApiError) {
  let usuarioId = null

  async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
    let r
    try {
      r = await fetch(`${base.replace(/\/$/, '')}/api${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(usuarioId ? { 'X-Usuario-Id': String(usuarioId) } : {}) },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      })
    } catch {
      throw new ApiError(0, 'No se pudo conectar con la API. ¿Está corriendo el servidor?')
    }
    if (r.status === 204) return null
    const datos = await r.json().catch(() => ({}))
    if (!r.ok) throw new ApiError(r.status, datos.error ?? `Error ${r.status}`, datos.campos)
    return datos
  }

  return {
    setSesion: (id) => (usuarioId = id),
    usuariosDemo: () => pedir('/usuarios-demo'),
    resumen: () => pedir('/resumen'),
    productos: () => pedir('/productos'),
    crearProducto: (d) => pedir('/productos', { metodo: 'POST', cuerpo: d }),
    actualizarProducto: (id, d) => pedir(`/productos/${id}`, { metodo: 'PUT', cuerpo: d }),
    ajustarStock: (id, d) => pedir(`/productos/${id}/ajustes`, { metodo: 'POST', cuerpo: d }),
    pedidos: () => pedir('/pedidos'),
    pedido: (folio) => pedir(`/pedidos/${encodeURIComponent(folio)}`),
    cambiarEstatus: (folio, estatus, nota) => pedir(`/pedidos/${encodeURIComponent(folio)}/estatus`, { metodo: 'POST', cuerpo: { estatus, nota } }),
    usuarios: () => pedir('/usuarios'),
    crearUsuario: (d) => pedir('/usuarios', { metodo: 'POST', cuerpo: d }),
    actualizarUsuario: (id, d) => pedir(`/usuarios/${id}`, { metodo: 'PUT', cuerpo: d }),
    bitacora: () => pedir('/bitacora'),
    reiniciar: () => pedir('/reiniciar', { metodo: 'POST' }),
  }
}
