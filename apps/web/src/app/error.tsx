'use client'

import { useEffect } from 'react'

import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from '@/ui/components/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Icono de error */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-danger" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-danger/5 animate-ping" />
          </div>
        </div>

        {/* Mensaje */}
        <h1 className="text-2xl font-bold text-foreground mb-3">Algo salió mal</h1>
        <p className="text-default-500 mb-8">
          Ha ocurrido un error inesperado. Nuestro equipo ya fue notificado. Puedes intentar de
          nuevo o volver al inicio.
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="font-semibold"
            color="primary"
            size="lg"
            startContent={<RefreshCw className="w-4 h-4" />}
            variant="bordered"
            onPress={reset}
          >
            Intentar de nuevo
          </Button>
          <Button
            className="font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
            color="primary"
            href="/"
            size="lg"
          >
            Volver al inicio
          </Button>
        </div>

        {/* Código de error (opcional) */}
        {error.digest && (
          <p className="mt-8 text-xs text-default-400">Código de error: {error.digest}</p>
        )}

        {/* Decoración */}
        <div className="mt-8 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-danger/40"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
