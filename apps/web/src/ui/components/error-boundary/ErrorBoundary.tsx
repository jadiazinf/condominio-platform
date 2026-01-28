'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from '@/ui/components/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/ui/components/card'

// ============================================================================
// TYPES
// ============================================================================

interface ErrorBoundaryProps {
  /** Content to render when there's no error */
  children: ReactNode

  /** Custom fallback UI - receives error and reset function */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)

  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void

  /** Called when the error boundary resets */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * React Error Boundary for catching and handling runtime errors.
 *
 * Use this component to wrap sections of your app that might throw errors,
 * preventing the entire app from crashing and providing a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Something went wrong: {error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 *   onError={(error) => logErrorToService(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset)
        }
        return this.props.fallback
      }

      // Default fallback UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

// ============================================================================
// DEFAULT FALLBACK UI
// ============================================================================

interface DefaultErrorFallbackProps {
  error: Error
  onReset: () => void
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="flex flex-col gap-2">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
            <span className="text-2xl text-danger">!</span>
          </div>
          <h2 className="text-xl font-semibold text-center">Algo salió mal</h2>
        </CardHeader>
        <CardBody className="text-center">
          <p className="text-default-500 mb-4">
            Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
          </p>
          {isDevelopment && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-default-400 hover:text-default-500">
                Detalles del error (solo desarrollo)
              </summary>
              <pre className="mt-2 p-3 bg-default-100 rounded-lg text-xs overflow-auto max-h-40">
                <code>{error.message}</code>
                {error.stack && (
                  <>
                    {'\n\n'}
                    <code className="text-default-400">{error.stack}</code>
                  </>
                )}
              </pre>
            </details>
          )}
        </CardBody>
        <CardFooter className="justify-center gap-2">
          <Button color="primary" onPress={onReset}>
            Intentar de nuevo
          </Button>
          <Button variant="flat" onPress={() => window.location.reload()}>
            Recargar página
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// ============================================================================
// PAGE-LEVEL ERROR BOUNDARY
// ============================================================================

interface PageErrorBoundaryProps {
  children: ReactNode
  pageName?: string
}

/**
 * Error Boundary specifically designed for page-level errors.
 * Provides a full-page fallback UI with navigation options.
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <PageErrorFallback error={error} onReset={reset} pageName={pageName} />
      )}
      onError={(error, errorInfo) => {
        // In production, you could send this to an error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Example: sendToErrorTracker(error, errorInfo, { page: pageName })
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

interface PageErrorFallbackProps {
  error: Error
  onReset: () => void
  pageName?: string
}

function PageErrorFallback({ error, onReset, pageName }: PageErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
          <span className="text-3xl text-danger">!</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {pageName ? `Error en ${pageName}` : 'Ocurrió un error'}
        </h1>

        <p className="text-default-500 mb-6">
          No pudimos cargar esta página. Por favor, intenta de nuevo o vuelve al inicio.
        </p>

        {isDevelopment && (
          <details className="text-left mb-6">
            <summary className="cursor-pointer text-sm text-default-400 hover:text-default-500">
              Detalles técnicos
            </summary>
            <pre className="mt-2 p-3 bg-default-100 rounded-lg text-xs overflow-auto max-h-40">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button color="primary" size="lg" onPress={onReset}>
            Intentar de nuevo
          </Button>
          <Button
            variant="bordered"
            size="lg"
            onPress={() => (window.location.href = '/dashboard')}
          >
            Ir al Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
