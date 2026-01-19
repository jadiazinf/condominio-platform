import type { ReactNode } from 'react'

import toast, { type ToastOptions } from 'react-hot-toast'

type TToastType = 'success' | 'error' | 'loading' | 'default'

interface IToastOptions {
  duration?: number
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  icon?: ReactNode
  id?: string
  className?: string
  style?: React.CSSProperties
}

interface IPromiseOptions<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((err: Error) => string)
}

function showToast(message: string, options?: IToastOptions) {
  return toast(message, options as ToastOptions)
}

function success(message: string, options?: IToastOptions) {
  return toast.success(message, options as ToastOptions)
}

function error(message: string, options?: IToastOptions) {
  return toast.error(message, options as ToastOptions)
}

function loading(message: string, options?: IToastOptions) {
  return toast.loading(message, options as ToastOptions)
}

function promise<T>(promise: Promise<T>, messages: IPromiseOptions<T>, options?: IToastOptions) {
  return toast.promise(promise, messages, options as ToastOptions)
}

function dismiss(toastId?: string) {
  if (toastId) {
    toast.dismiss(toastId)
  } else {
    toast.dismiss()
  }
}

function remove(toastId?: string) {
  if (toastId) {
    toast.remove(toastId)
  } else {
    toast.remove()
  }
}

function custom(content: ReactNode, options?: IToastOptions) {
  return toast.custom(content as Parameters<typeof toast.custom>[0], options as ToastOptions)
}

export const toastService = {
  show: showToast,
  success,
  error,
  loading,
  promise,
  dismiss,
  remove,
  custom,
}

export type { TToastType, IToastOptions, IPromiseOptions }
