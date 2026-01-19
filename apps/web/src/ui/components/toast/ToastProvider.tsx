'use client'

import { Toaster, ToasterProps } from 'react-hot-toast'

type TToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

interface IToastProviderProps {
  position?: TToastPosition
  reverseOrder?: boolean
  gutter?: number
  containerClassName?: string
  containerStyle?: React.CSSProperties
  toastOptions?: ToasterProps['toastOptions']
}

export function ToastProvider({
  position = 'top-center',
  reverseOrder = false,
  gutter = 8,
  containerClassName,
  containerStyle,
  toastOptions,
}: IToastProviderProps) {
  return (
    <Toaster
      containerClassName={containerClassName}
      containerStyle={containerStyle}
      gutter={gutter}
      position={position}
      reverseOrder={reverseOrder}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg, #fff)',
          color: 'var(--toast-color, #363636)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#6366F1',
            secondary: '#fff',
          },
        },
        ...toastOptions,
      }}
    />
  )
}

export type { IToastProviderProps, TToastPosition }
