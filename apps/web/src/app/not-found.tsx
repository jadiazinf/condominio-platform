import Link from 'next/link'

import { Button } from '@/ui/components/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Ilustración 404 */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-gradient-primary leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 animate-pulse" />
          </div>
        </div>

        {/* Mensaje */}
        <h1 className="text-2xl font-bold text-foreground mb-3">Página no encontrada</h1>
        <p className="text-default-500 mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida. Pero no te preocupes, puedes
          volver al inicio.
        </p>

        {/* Botón de acción */}
        <Link href="/">
          <Button
            className="font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
            color="primary"
            size="lg"
          >
            Volver al inicio
          </Button>
        </Link>

        {/* Decoración */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
          <div
            className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: '0.1s' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary/20 animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </div>
  )
}
