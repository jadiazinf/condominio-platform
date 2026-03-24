'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Algo salió mal</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Ha ocurrido un error inesperado. Por favor intenta de nuevo.
          </p>
          <button
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
            onClick={reset}
          >
            Intentar de nuevo
          </button>
          {error.digest && (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
              Error: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
