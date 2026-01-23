'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  createManagementCompanyWithAdminFormSchema,
  companyStepSchema,
  adminStepSchema,
  type TCreateManagementCompanyWithAdminForm,
  type TCompanyStep,
  type TAdminStep,
} from '@packages/domain'
import {
  createManagementCompany,
  createManagementCompanyWithAdmin,
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

  const form = useForm<TCreateManagementCompanyWithAdminForm>({
    resolver: zodResolver(createManagementCompanyWithAdminFormSchema),
    defaultValues: {
      company: {
        name: '',
        legalName: null,
        taxId: null,
        email: null,
        phone: null,
        website: null,
        address: null,
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

    try {
      if (currentStep === 'company') {
        companyStepSchema.parse(values.company)
        return true
      }

      if (currentStep === 'admin') {
        adminStepSchema.parse(values.admin)
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
  }, [currentStep, form])

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
          taxId: data.company.taxId || null,
          email: data.company.email || null,
          phone: data.company.phone || null,
          website: data.company.website || null,
          address: data.company.address || null,
          locationId: null,
          isActive: true,
          logoUrl: null,
          metadata: null,
          createdBy: null,
        }

        if (data.admin.mode === 'existing' && data.admin.existingUserId) {
          await createManagementCompany(token, {
            ...companyData,
            createdBy: data.admin.existingUserId,
          })
        } else {
          // Prepare admin data - firebaseUid will be set by the API after creating Firebase user
          const adminData = {
            firebaseUid: `pending_${Date.now()}`, // Temporary, should be replaced by backend
            email: data.admin.email,
            firstName: data.admin.firstName,
            lastName: data.admin.lastName,
            displayName: `${data.admin.firstName} ${data.admin.lastName}`,
            phoneCountryCode: data.admin.phoneCountryCode || null,
            phoneNumber: data.admin.phoneNumber || null,
            photoUrl: null,
            idDocumentType: null,
            idDocumentNumber: null,
            address: null,
            locationId: null,
            preferredLanguage: 'es' as const,
            preferredCurrencyId: null,
            isActive: true,
            isEmailVerified: false,
            lastLogin: null,
            metadata: null,
          }

          await createManagementCompanyWithAdmin(token, {
            company: companyData,
            admin: adminData,
          })
        }

        toast.success(t('superadmin.companies.form.success'))
        options.onSuccess?.()
        router.push('/dashboard/companies')
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

  return {
    form,
    control: form.control,
    errors: form.formState.errors,
    currentStep,
    currentStepIndex,
    totalSteps: STEPS.length,
    isFirstStep,
    isLastStep,
    isSubmitting,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleSubmit: form.handleSubmit(handleSubmit),
    translateError,
    getValues: form.getValues,
    steps: STEPS,
  }
}
