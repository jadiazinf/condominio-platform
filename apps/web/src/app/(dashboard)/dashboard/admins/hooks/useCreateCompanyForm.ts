'use client'

import { useState, useCallback } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  createManagementCompanyWithAdminFormSchema,
  companyStepSchema,
  adminStepSchema,
  type TCreateManagementCompanyWithAdminForm,
} from '@packages/domain'
import {
  createManagementCompany,
  createCompanyWithAdmin,
  getUserByEmail,
  HttpError,
} from '@packages/http-client'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export type TFormStep = 'company' | 'admin' | 'confirmation'

const STEPS: TFormStep[] = ['company', 'admin', 'confirmation']

interface UseCreateCompanyFormOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useCreateCompanyForm(options: UseCreateCompanyFormOptions = {}) {
  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<TFormStep>('company')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidatingAdmin, setIsValidatingAdmin] = useState(false)
  // Track which steps have had validation triggered (user tried to advance)
  const [validatedSteps, setValidatedSteps] = useState<Set<TFormStep>>(new Set())

  const form = useForm<TCreateManagementCompanyWithAdminForm>({
    resolver: zodResolver(createManagementCompanyWithAdminFormSchema) as Resolver<TCreateManagementCompanyWithAdminForm>,
    defaultValues: {
      company: {
        name: '',
        legalName: '',
        taxIdType: 'J',
        taxIdNumber: '',
        email: '',
        phoneCountryCode: '+58',
        phone: '',
        website: '',
        address: '',
        locationId: '',
      },
      admin: {
        mode: 'new',
        existingUserId: null,
        existingUserEmail: '',
        firstName: '',
        lastName: '',
        email: '',
        phoneCountryCode: '+58',
        phoneNumber: null,
      },
    },
    mode: 'onChange',
  })

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const values = form.getValues()

    // Mark current step as validated (user attempted to advance)
    setValidatedSteps(prev => new Set(prev).add(currentStep))

    try {
      if (currentStep === 'company') {
        companyStepSchema.parse(values.company)
        return true
      }

      if (currentStep === 'admin') {
        // First validate the schema
        adminStepSchema.parse(values.admin)

        // If mode is 'new', check if email already exists
        if (values.admin.mode === 'new' && values.admin.email && firebaseUser) {
          setIsValidatingAdmin(true)
          try {
            const token = await firebaseUser.getIdToken()
            const existingUser = await getUserByEmail(token, values.admin.email)

            // User exists - check if active or inactive
            if (existingUser) {
              if (!existingUser.isActive) {
                // User exists but is inactive
                form.setError('admin.email', {
                  type: 'manual',
                  message: 'superadmin.companies.form.adminValidation.userInactive',
                })
              } else {
                // User exists and is active - should use "existing user" option
                form.setError('admin.email', {
                  type: 'manual',
                  message: 'superadmin.companies.form.adminValidation.emailExists',
                })
              }
              return false
            }
          } catch (err) {
            // 404 means user doesn't exist - this is what we want for new users
            if (HttpError.isHttpError(err) && err.status === 404) {
              // User doesn't exist, we can proceed
              return true
            }
            // Other errors - show a generic error
            toast.error(t('superadmin.companies.form.adminValidation.error'))
            return false
          } finally {
            setIsValidatingAdmin(false)
          }
        }

        return true
      }

      return true
    } catch {
      // Trigger validation to show errors
      if (currentStep === 'company') {
        await form.trigger('company')
      } else if (currentStep === 'admin') {
        await form.trigger('admin')
      }
      return false
    }
  }, [currentStep, form, firebaseUser, toast, t])

  const goToNextStep = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    }
  }, [currentStepIndex, validateCurrentStep])

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }, [currentStepIndex])

  const goToStep = useCallback((step: TFormStep) => {
    setCurrentStep(step)
  }, [])

  const handleSubmit = useCallback(
    async (data: TCreateManagementCompanyWithAdminForm) => {
      if (!firebaseUser) return

      try {
        setIsSubmitting(true)
        const token = await firebaseUser.getIdToken()

        // Prepare company data
        const companyData = {
          name: data.company.name,
          legalName: data.company.legalName || null,
          taxIdType: data.company.taxIdType || null,
          taxIdNumber: data.company.taxIdNumber || null,
          email: data.company.email || null,
          phoneCountryCode: data.company.phoneCountryCode || null,
          phone: data.company.phone || null,
          website: data.company.website || null,
          address: data.company.address || null,
          locationId: data.company.locationId || null,
          isActive: true,
          logoUrl: null,
          metadata: null,
          createdBy: null, // Backend will set from authenticated user
        }

        if (data.admin.mode === 'existing' && data.admin.existingUserId) {
          // For existing users, create company with isActive=true
          // Backend will set createdBy from authenticated user
          await createManagementCompany(token, companyData)
        } else {
          // For new users, use the invitation flow
          // This creates: user (inactive), company (inactive), and invitation
          const result = await createCompanyWithAdmin(token, {
            company: {
              name: data.company.name,
              legalName: data.company.legalName || null,
              taxIdType: data.company.taxIdType || null,
              taxIdNumber: data.company.taxIdNumber || null,
              email: data.company.email || null,
              phoneCountryCode: data.company.phoneCountryCode || null,
              phone: data.company.phone || null,
              website: data.company.website || null,
              address: data.company.address || null,
              locationId: data.company.locationId || null,
              logoUrl: null,
              metadata: null,
            },
            admin: {
              email: data.admin.email ?? '',
              firstName: data.admin.firstName ?? null,
              lastName: data.admin.lastName ?? null,
              displayName: `${data.admin.firstName ?? ''} ${data.admin.lastName ?? ''}`.trim(),
              phoneCountryCode: data.admin.phoneCountryCode || null,
              phoneNumber: data.admin.phoneNumber || null,
              photoUrl: null,
              idDocumentType: null,
              idDocumentNumber: null,
              address: null,
              locationId: null,
              preferredLanguage: 'es' as const,
              preferredCurrencyId: null,
              lastLogin: null,
              metadata: null,
            },
            expirationDays: 7,
          })

          // Email is automatically sent by the backend
          // result.emailSent indicates if the email was sent successfully
          if (!result.emailSent) {
            toast.show(t('superadmin.companies.form.emailNotSent'))
          }
        }

        toast.success(t('superadmin.companies.form.success'))
        options.onSuccess?.()
        router.push('/dashboard/admins')
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')

        if (HttpError.isHttpError(err)) {
          toast.error(err.message)
        } else {
          toast.error(t('superadmin.companies.form.error'))
        }

        options.onError?.(error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [firebaseUser, toast, t, options, router]
  )

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  // Helper to check if an error should be shown for a field
  const shouldShowError = useCallback(
    (fieldPath: string): boolean => {
      // Get the step for this field
      const step = fieldPath.startsWith('company.') ? 'company' : 'admin'

      // Show error if:
      // 1. The step has been validated (user tried to advance), OR
      // 2. The specific field has been touched
      const stepValidated = validatedSteps.has(step)
      const fieldTouched = fieldPath.split('.').reduce(
        (obj: Record<string, unknown> | undefined, key) => {
          return obj?.[key] as Record<string, unknown> | undefined
        },
        form.formState.touchedFields as Record<string, unknown>
      )

      return stepValidated || !!fieldTouched
    },
    [validatedSteps, form.formState.touchedFields]
  )

  return {
    form,
    control: form.control,
    errors: form.formState.errors,
    touchedFields: form.formState.touchedFields,
    validatedSteps,
    shouldShowError,
    currentStep,
    currentStepIndex,
    totalSteps: STEPS.length,
    isFirstStep,
    isLastStep,
    isSubmitting,
    isValidatingAdmin,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleSubmit: form.handleSubmit(handleSubmit),
    translateError,
    getValues: form.getValues,
    steps: STEPS,
  }
}
