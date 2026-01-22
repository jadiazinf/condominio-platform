'use client'

import { useCallback } from 'react'
import {
  useForm,
  type UseFormProps,
  type FieldValues,
  type UseFormReturn,
  type DefaultValues,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, HttpError } from '@packages/http-client'
import type { z } from 'zod'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts/I18nContext'

// ============================================================================
// TYPES
// ============================================================================

interface UseFormMutationOptions<TSchema extends z.ZodObject<z.ZodRawShape>, TResponse> {
  /** Zod schema for validation */
  schema: TSchema

  /** Default values for the form */
  defaultValues: DefaultValues<z.infer<TSchema>>

  /** Mutation function that receives token and data, returns response */
  mutationFn: (token: string, data: z.infer<TSchema>) => Promise<TResponse>

  /** Success message translation key */
  successMessage?: string

  /** Error message translation key (used when error doesn't have a message) */
  errorMessage?: string

  /** Called on successful mutation */
  onSuccess?: (data: TResponse) => void

  /** Called on mutation error */
  onError?: (error: Error) => void

  /** Called when mutation completes (success or error) */
  onSettled?: () => void

  /** Additional react-hook-form options */
  formOptions?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver' | 'defaultValues'>
}

interface UseFormMutationReturn<TData extends FieldValues, TResponse> {
  /** React Hook Form instance */
  form: UseFormReturn<TData>

  /** Whether the mutation is currently in progress */
  isSubmitting: boolean

  /** Whether the form has unsaved changes */
  isDirty: boolean

  /** Form errors */
  errors: UseFormReturn<TData>['formState']['errors']

  /** Form control for Controller components */
  control: UseFormReturn<TData>['control']

  /** Submit handler (pass to form onSubmit) */
  handleSubmit: ReturnType<UseFormReturn<TData>['handleSubmit']>

  /** Reset form to default values */
  handleCancel: () => void

  /** Reset form with new values */
  reset: (values?: DefaultValues<TData>) => void

  /** Translate error message from validation key */
  translateError: (message: string | undefined) => string | undefined

  /** Last mutation result */
  data: TResponse | undefined

  /** Last mutation error */
  error: Error | null
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Generic hook for forms with API mutations.
 *
 * Combines react-hook-form + zod validation + react-query mutation
 * with built-in auth token handling, toast notifications, and error handling.
 *
 * @example
 * ```tsx
 * const { form, handleSubmit, isSubmitting } = useFormMutation({
 *   schema: userUpdateProfileSchema,
 *   defaultValues: { firstName: '', lastName: '' },
 *   mutationFn: (token, data) => updateProfile(token, data),
 *   successMessage: 'settings.profile.updateSuccess',
 *   errorMessage: 'settings.profile.updateError',
 *   onSuccess: (updatedUser) => setUser(updatedUser),
 * })
 *
 * return (
 *   <form onSubmit={handleSubmit}>
 *     <Input {...form.register('firstName')} />
 *     <Button type="submit" loading={isSubmitting}>Save</Button>
 *   </form>
 * )
 * ```
 */
export function useFormMutation<TSchema extends z.ZodObject<z.ZodRawShape>, TResponse>({
  schema,
  defaultValues,
  mutationFn,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  onSettled,
  formOptions,
}: UseFormMutationOptions<TSchema, TResponse>): UseFormMutationReturn<z.infer<TSchema>, TResponse> {
  type TData = z.infer<TSchema>

  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()

  // Initialize form with zod validation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TData>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    ...formOptions,
  })

  // Setup mutation with auth token handling
  const mutation = useMutation<TResponse, Error, TData>({
    mutationFn: async (data: TData) => {
      if (!firebaseUser) {
        throw new Error('Not authenticated')
      }
      const token = await firebaseUser.getIdToken()
      return mutationFn(token, data)
    },
    onSuccess: (data: TResponse) => {
      if (successMessage) {
        toast.success(t(successMessage))
      }
      onSuccess?.(data)
    },
    onError: (error: Error) => {
      if (HttpError.isHttpError(error)) {
        toast.error(error.message)
      } else if (errorMessage) {
        toast.error(t(errorMessage))
      } else {
        toast.error(error.message)
      }
      onError?.(error)
    },
    onSettled,
  })

  // Submit handler that triggers validation and mutation
  const handleSubmit = form.handleSubmit(async (data: TData) => {
    await mutation.mutateAsync(data)
    form.reset(data as DefaultValues<TData>) // Reset form state with new values to clear isDirty
  })

  // Cancel handler - reset form to default values
  const handleCancel = useCallback(() => {
    form.reset()
  }, [form])

  // Reset form with optional new values
  const reset = useCallback(
    (values?: DefaultValues<TData>) => {
      form.reset(values)
    },
    [form]
  )

  // Helper to translate validation error messages
  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  return {
    form,
    isSubmitting: mutation.isPending,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    control: form.control,
    handleSubmit,
    handleCancel,
    reset,
    translateError,
    data: mutation.data,
    error: mutation.error,
  }
}

// ============================================================================
// SIMPLIFIED VARIANTS
// ============================================================================

/**
 * Simplified hook for mutations without form state.
 * Use when you just need to call an API with auth token.
 */
export function useAuthMutation<TData, TResponse>(
  mutationFn: (token: string, data: TData) => Promise<TResponse>,
  options?: {
    successMessage?: string
    errorMessage?: string
    onSuccess?: (data: TResponse) => void
    onError?: (error: Error) => void
    onSettled?: () => void
  }
) {
  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()

  return useMutation<TResponse, Error, TData>({
    mutationFn: async (data: TData) => {
      if (!firebaseUser) {
        throw new Error('Not authenticated')
      }
      const token = await firebaseUser.getIdToken()
      return mutationFn(token, data)
    },
    onSuccess: (data: TResponse) => {
      if (options?.successMessage) {
        toast.success(t(options.successMessage))
      }
      options?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      if (HttpError.isHttpError(error)) {
        toast.error(error.message)
      } else if (options?.errorMessage) {
        toast.error(t(options.errorMessage))
      } else {
        toast.error(error.message)
      }
      options?.onError?.(error)
    },
    onSettled: options?.onSettled,
  })
}
