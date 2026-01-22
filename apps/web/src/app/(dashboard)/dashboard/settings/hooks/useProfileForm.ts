'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userUpdateProfileSchema, type TUserUpdateProfile } from '@packages/domain'
import { updateProfile, HttpError } from '@packages/http-client'

import { useAuth, useUser, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

interface UseProfileFormOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useProfileForm(options: UseProfileFormOptions = {}) {
  const { user: firebaseUser } = useAuth()
  const { user, setUser } = useUser()
  const { t } = useTranslation()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TUserUpdateProfile>({
    resolver: zodResolver(userUpdateProfileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      displayName: user?.displayName || '',
      phoneCountryCode: user?.phoneCountryCode || '+58',
      phoneNumber: user?.phoneNumber || '',
      idDocumentType: user?.idDocumentType || null,
      idDocumentNumber: user?.idDocumentNumber || '',
      address: user?.address || '',
    },
  })

  // Reset form when user data becomes available (e.g., after hydration)
  useEffect(() => {
    if (user && !form.formState.isDirty) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || '',
        phoneCountryCode: user.phoneCountryCode || '+58',
        phoneNumber: user.phoneNumber || '',
        idDocumentType: user.idDocumentType || null,
        idDocumentNumber: user.idDocumentNumber || '',
        address: user.address || '',
      })
    }
  }, [user, form])

  const handleSubmit = useCallback(
    async (data: TUserUpdateProfile) => {
      if (!firebaseUser) return

      try {
        setIsSubmitting(true)
        const token = await firebaseUser.getIdToken()
        const updatedUser = await updateProfile(token, data)

        setUser(updatedUser)
        form.reset(data)
        toast.success(t('settings.profile.updateSuccess'))
        options.onSuccess?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')

        if (HttpError.isHttpError(err)) {
          toast.error(err.message)
        } else {
          toast.error(t('settings.profile.updateError'))
        }

        options.onError?.(error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [firebaseUser, setUser, form, toast, t, options]
  )

  const handleCancel = useCallback(() => {
    form.reset()
  }, [form])

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  return {
    form,
    user,
    isSubmitting,
    isDirty: form.formState.isDirty,
    errors: form.formState.errors,
    control: form.control,
    handleSubmit: form.handleSubmit(handleSubmit),
    handleCancel,
    translateError,
  }
}
