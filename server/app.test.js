import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearApp } from './app.js'

let servidor, base

beforeAll(async () => {
  servidor = crearApp().listen(0)
  await new Promise((r) => servidor.once('listening', r))
  base = `http://127.0.0.1:${servidor.address().port}/api`
})
afterAll(() => servidor.close())

const pedir = (ruta, { usuario, metodo = 'GET', cuerpo } = {}) =>
  fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(usuario ? { 'X-Usuario-Id': String(usuario) } : {}) },
    body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })

describe('API REST', () => {
  it('GET /productos exige sesión', async () => {
    expect((await pedir('/productos')).status).toBe(401)
    const r = await pedir('/productos', { usuario: 3 })
    expect(r.status).toBe(200)
    expect(await r.json()).toHaveLength(26)
  })

  it('POST /productos responde 201, 403 o 422 según el caso', async () => {
    const cuerpo = { sku: 'ACC-IMP-27', nombre: 'Impermeable', categoria: 'Accesorios', precio: 399, stock: 5, stockMinimo: 2 }
    expect((await pedir('/productos', { usuario: 3, metodo: 'POST', cuerpo })).status).toBe(403)
    expect((await pedir('/productos', { usuario: 1, metodo: 'POST', cuerpo })).status).toBe(201)
    const dup = await pedir('/productos', { usuario: 1, metodo: 'POST', cuerpo })
    expect(dup.status).toBe(422)
    expect((await dup.json()).campos.sku).toMatch(/Ya existe/)
  })

  it('cambia el estatus de un pedido y deja rastro en la bitácora', async () => {
    const pedidos = await (await pedir('/pedidos', { usuario: 1 })).json()
    const enviado = pedidos.find((p) => p.estatus === 'Enviado')
    const r = await pedir(`/pedidos/${enviado.folio}/estatus`, { usuario: 3, metodo: 'POST', cuerpo: { estatus: 'Entregado' } })
    expect(r.status).toBe(200)
    expect((await r.json()).estatus).toBe('Entregado')
    const bitacora = await (await pedir('/bitacora', { usuario: 1 })).json()
    expect(bitacora[0].detalle).toContain(`${enviado.folio} · Enviado → Entregado`)
  })

  it('responde 400 con JSON inválido y 404 en rutas desconocidas', async () => {
    expect((await pedir('/productos', { usuario: 1, metodo: 'POST', cuerpo: '{mal' })).status).toBe(400)
    expect((await pedir('/no-existe', { usuario: 1 })).status).toBe(404)
  })
})
