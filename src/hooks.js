import { ApiError } from './api'
import { useCallback, useEffect, useState } from 'react'

// Carga datos de la API con estados de carga y error, y permite recargar después de un cambio.
export function useCarga(cargar) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    cargar()
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch((error) => vigente && setEstado({ datos: null, cargando: false, error }))
    return () => {
      vigente = false
    }
  }, [cargar, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}

export const fmtMXN = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export function fmtFecha(iso, conHora = true) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Mexico_City',
  })
}

// Envía el formulario y reparte los errores de validación de la API por campo.
export function useEnvio(enviar, onGuardado) {
  const [errores, setErrores] = useState({})
  const [general, setGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setGeneral('')
    try {
      const r = await enviar()
      setErrores({})
      onGuardado(r)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrores(err.campos)
        setGeneral(err.message)
      } else {
        setGeneral('Ocurrió un error inesperado.')
      }
    } finally {
      setEnviando(false)
    }
  }
  return { errores, general, enviando, onSubmit }
}

