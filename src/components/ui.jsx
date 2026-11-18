import { useEffect, useRef } from 'react'

// Piezas de interfaz reutilizables: modal, campo de formulario, estados y paginación.

export function Modal({ abierto, titulo, onCerrar, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog ref={ref} className="modal" onClose={onCerrar} aria-labelledby="modal-titulo">
      {abierto && (
        <>
          <header className="modal-head">
            <h2 id="modal-titulo">{titulo}</h2>
            <button type="button" className="btn-icon" onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </header>
          {children}
        </>
      )}
    </dialog>
  )
}

export function Campo({ label, error, children, ayuda }) {
  return (
    <label className={`campo ${error ? 'invalido' : ''}`}>
      <span>{label}</span>
      {children}
      {ayuda && !error && <small className="muted">{ayuda}</small>}
      {error && <small className="error">{error}</small>}
    </label>
  )
}

const TONO_ESTATUS = { Pendiente: 'warn', Preparando: 'info', Enviado: 'info', Entregado: 'ok', Cancelado: 'neutral' }
export function Estatus({ valor }) {
  return <span className={`pill pill-${TONO_ESTATUS[valor] ?? 'neutral'}`}>{valor}</span>
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <p className="cargando" role="status">
      <span className="spinner" aria-hidden="true" /> {texto}
    </p>
  )
}

export function ErrorCarga({ error, onReintentar }) {
  return (
    <div className="aviso aviso-error" role="alert">
      <p>{error?.message ?? 'Ocurrió un error.'}</p>
      {onReintentar && (
        <button type="button" className="btn btn-sec" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Paginacion({ pagina, total, porPagina, onCambiar }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas === 1) return null
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" className="btn btn-sec" disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
        ← Anterior
      </button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <button type="button" className="btn btn-sec" disabled={pagina === paginas} onClick={() => onCambiar(pagina + 1)}>
        Siguiente →
      </button>
    </nav>
  )
}
