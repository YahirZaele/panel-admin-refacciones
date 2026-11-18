// Capa de acceso a datos. Las páginas solo usan este objeto "api", sin saber si detrás está:
// - la API real de Express (si se define VITE_API_URL al compilar), o
// - la API simulada en el navegador (demo de GitHub Pages), con las mismas reglas de negocio.
import { crearApiHttp } from './http'
import { crearApiDemo } from './mock'

export class ApiError extends Error {
  constructor(status, mensaje, campos) {
    super(mensaje)
    this.status = status
    this.campos = campos ?? {}
  }
}

const URL_API = import.meta.env.VITE_API_URL
export const MODO = URL_API ? 'api' : 'demo'
export const api = URL_API ? crearApiHttp(URL_API, ApiError) : crearApiDemo(ApiError)
