import { useCallback } from 'react'

import { toastService, type IToastOptions, type IPromiseOptions } from './toast'

export function useToast() {
  const show = useCallback((message: string, options?: IToastOptions) => {
    return toastService.show(message, options)
  }, [])

  const success = useCallback((message: string, options?: IToastOptions) => {
    return toastService.success(message, options)
  }, [])

  const error = useCallback((message: string, options?: IToastOptions) => {
    return toastService.error(message, options)
  }, [])

  const loading = useCallback((message: string, options?: IToastOptions) => {
    return toastService.loading(message, options)
  }, [])

  const promise = useCallback(
    <T>(promiseToHandle: Promise<T>, messages: IPromiseOptions<T>, options?: IToastOptions) => {
      return toastService.promise(promiseToHandle, messages, options)
    },
    []
  )

  const dismiss = useCallback((toastId?: string) => {
    toastService.dismiss(toastId)
  }, [])

  const remove = useCallback((toastId?: string) => {
    toastService.remove(toastId)
  }, [])

  return {
    show,
    success,
    error,
    loading,
    promise,
    dismiss,
    remove,
  }
}
