'use client'

import { useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import {
  useCreateCondominium,
  useQueryClient,
  companyCondominiumsKeys,
} from '@packages/http-client'
import type { TCondominiumCreate } from '@packages/domain'

export type TCondominiumStep = 'basic' | 'location' | 'contact' | 'confirmation'

export interface ICondominiumFormData {
  // Basic
  name: string
  code: string
  isActive: boolean

  // Location
  address: string
  locationId: string

  // Contact
  email: string
  phone: string
  phoneCountryCode: string

  // Metadata
  metadata: Record<string, unknown> | null
}

interface UseCondominiumFormProps {
  managementCompanyId: string
  createdBy: string
  onClose: () => void
  onSuccess?: () => void
}

const STEPS: TCondominiumStep[] = ['basic', 'location', 'contact', 'confirmation']

export function useCondominiumForm({
  managementCompanyId,
  createdBy,
  onClose,
  onSuccess,
}: UseCondominiumFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set([0]))

  const form = useForm<ICondominiumFormData>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      code: '',
      isActive: true,
      address: '',
      locationId: '',
      email: '',
      phone: '',
      phoneCountryCode: '+1',
      metadata: null,
    },
  })

  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch,
  } = form

  const currentStep = STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1
  const totalSteps = STEPS.length

  const { mutate: createCondominium, isPending: isCreating } = useCreateCondominium({
    onSuccess: () => {
      toast.success(t('condominiums.success.created'))
      // Invalidate company condominiums list
      queryClient.invalidateQueries({ queryKey: companyCondominiumsKeys.all })
      // Invalidate can-create-resource check (subscription limits)
      queryClient.invalidateQueries({
        queryKey: ['management-companies', managementCompanyId, 'can-create', 'condominium']
      })
      onSuccess?.()
      onClose()
    },
    onError: error => {
      toast.error(error.message || t('condominiums.errors.createError'))
    },
  })

  const isSubmitting = isCreating

  // Fields to validate for each step
  const stepFields: Record<TCondominiumStep, (keyof ICondominiumFormData)[]> = {
    basic: ['name'],
    location: ['address', 'locationId'],
    contact: ['email', 'phone', 'phoneCountryCode'],
    confirmation: [],
  }

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const fields = stepFields[currentStep]
    if (fields.length === 0) return true
    return await trigger(fields)
  }, [currentStep, trigger])

  const goToNextStep = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStepIndex < STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      setTouchedSteps(prev => new Set([...Array.from(prev), nextIndex]))
    }
  }, [currentStepIndex, validateCurrentStep])

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [currentStepIndex])

  const goToStep = useCallback(
    async (step: TCondominiumStep) => {
      const targetIndex = STEPS.indexOf(step)
      if (targetIndex < 0) return

      // Can always go back
      if (targetIndex < currentStepIndex) {
        setCurrentStepIndex(targetIndex)
        return
      }

      // Going forward requires validation of all steps in between
      for (let i = currentStepIndex; i < targetIndex; i++) {
        const stepToValidate = STEPS[i]
        const fields = stepFields[stepToValidate]
        if (fields.length > 0) {
          const isValid = await trigger(fields)
          if (!isValid) {
            setCurrentStepIndex(i)
            return
          }
        }
      }

      setCurrentStepIndex(targetIndex)
      setTouchedSteps(prev => new Set([...Array.from(prev), targetIndex]))
    },
    [currentStepIndex, trigger]
  )

  // Build condominium data from form values
  const buildCondominiumData = useCallback(
    (data: ICondominiumFormData): TCondominiumCreate => {
      return {
        name: data.name,
        code: data.code || null,
        managementCompanyIds: [managementCompanyId],
        address: data.address || null,
        locationId: data.locationId || null,
        email: data.email || null,
        phone: data.phone || null,
        phoneCountryCode: data.phoneCountryCode || null,
        defaultCurrencyId: null,
        isActive: data.isActive,
        metadata: data.metadata,
        createdBy,
      }
    },
    [managementCompanyId, createdBy]
  )

  const handleSubmit = useCallback(() => {
    rhfHandleSubmit(data => {
      const condominiumData = buildCondominiumData(data)
      createCondominium(condominiumData)
    })()
  }, [rhfHandleSubmit, buildCondominiumData, createCondominium])

  const shouldShowError = useCallback(
    (field: keyof ICondominiumFormData): boolean => {
      return !!errors[field] && touchedSteps.has(currentStepIndex)
    },
    [errors, touchedSteps, currentStepIndex]
  )

  const translateError = useCallback(
    (field: keyof ICondominiumFormData): string | undefined => {
      const error = errors[field]
      if (!error?.message) return undefined
      return error.message as string
    },
    [errors]
  )

  const steps = useMemo(
    () =>
      STEPS.map(step => ({
        key: step,
        title: t(`condominiums.form.steps.${step}`),
      })),
    [t]
  )

  return {
    form,
    managementCompanyId,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    handleSubmit,
    shouldShowError,
    translateError,
    getValues,
    setValue,
    watch,
    errors,
    steps,
  }
}
