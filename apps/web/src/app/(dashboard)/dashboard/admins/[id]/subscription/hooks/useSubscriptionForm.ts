'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import {
  useCreateSubscription,
  useCancelSubscription,
  useManagementCompanySubscription,
  managementCompanySubscriptionKeys,
  useQueryClient,
} from '@packages/http-client'
import type { TManagementCompanySubscriptionCreate, TManagementCompanySubscription } from '@packages/domain'

type TBillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom'
type TSubscriptionStatus = 'trial' | 'active' | 'inactive' | 'cancelled' | 'suspended'

export type TSubscriptionStep = 'basic' | 'limits' | 'pricing' | 'confirmation'

export type TDiscountType = 'percentage' | 'fixed' | 'none'

export interface ISubscriptionFormData {
  subscriptionName: string
  billingCycle: TBillingCycle
  basePrice: string
  status: TSubscriptionStatus
  startDate: string
  endDate: string
  trialEndsAt: string
  autoRenew: boolean
  maxCondominiums: string
  maxUnits: string
  maxUsers: string
  maxStorageGb: string
  customFeatures: Record<string, boolean>
  notes: string
  // Pricing fields
  discountType: TDiscountType
  discountValue: string
  pricingNotes: string
  pricingCondominiumCount: number | null
  pricingUnitCount: number | null
  pricingUserCount: number | null
  pricingCondominiumRate: number
  pricingUnitRate: number
  pricingUserRate: number
  calculatedPrice: number | null
  discountAmount: number | null
  annualDiscountAmount: number | null
  // Rate tracking
  rateId: string | null
  // Pricing validation (set by PricingStepForm)
  pricingError: boolean
}

interface UseSubscriptionFormProps {
  companyId: string
  createdBy: string
  onClose: () => void
  isOpen?: boolean
}

const STEPS: TSubscriptionStep[] = ['basic', 'limits', 'pricing', 'confirmation']

export function useSubscriptionForm({
  companyId,
  createdBy,
  onClose,
  isOpen = false,
}: UseSubscriptionFormProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set([0]))
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)

  // Ref to store pending subscription data for replacement flow
  const pendingSubscriptionDataRef = useRef<TManagementCompanySubscriptionCreate | null>(null)

  // Fetch current active subscription to check if replacement is needed
  // Only fetch when the modal is open to avoid duplicate queries
  const { data: activeSubscriptionData } = useManagementCompanySubscription(companyId, {
    enabled: !!companyId && isOpen,
  })

  const activeSubscription: TManagementCompanySubscription | null = useMemo(() => {
    const sub = activeSubscriptionData?.data
    if (!sub) return null
    // Only consider active or trial subscriptions as "active"
    if (sub.status === 'active' || sub.status === 'trial') {
      return sub
    }
    return null
  }, [activeSubscriptionData])

  const form = useForm<ISubscriptionFormData>({
    mode: 'onBlur',
    defaultValues: {
      subscriptionName: t('superadmin.companies.subscription.form.fields.subscriptionNameOptions.basic'),
      billingCycle: 'monthly',
      basePrice: '',
      status: 'inactive',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      trialEndsAt: '',
      autoRenew: true,
      maxCondominiums: '1', // Default to 1 condominium
      maxUnits: '10', // Default to 10 units
      maxUsers: '6', // Default to 6 users (admin + staff)
      maxStorageGb: '50', // Default 50GB for document storage
      customFeatures: {},
      notes: '',
      // Pricing defaults (no hardcoded rates - must come from database)
      discountType: 'none',
      discountValue: '',
      pricingNotes: '',
      pricingCondominiumCount: null,
      pricingUnitCount: null,
      pricingUserCount: null,
      pricingCondominiumRate: 0,
      pricingUnitRate: 0,
      pricingUserRate: 0,
      calculatedPrice: null,
      discountAmount: null,
      annualDiscountAmount: null,
      rateId: null,
      pricingError: false,
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

  const { mutate: createSubscription, isPending: isCreating } = useCreateSubscription(companyId, {
    onSuccess: () => {
      toast.success(t('superadmin.companies.subscription.createSuccess'))
      queryClient.invalidateQueries({ queryKey: managementCompanySubscriptionKeys.all })
      setIsReplacing(false)
      pendingSubscriptionDataRef.current = null
      onClose()
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.companies.subscription.createError'))
      setIsReplacing(false)
    },
  })

  const { mutate: cancelSubscription, isPending: isCancelling } = useCancelSubscription(companyId, {
    onSuccess: () => {
      // After successful cancellation, create the new subscription
      if (pendingSubscriptionDataRef.current) {
        createSubscription(pendingSubscriptionDataRef.current)
      }
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.companies.subscription.cancelError'))
      setIsReplacing(false)
      pendingSubscriptionDataRef.current = null
    },
  })

  const isSubmitting = isCreating || isCancelling || isReplacing

  // Fields to validate for each step
  const stepFields: Record<TSubscriptionStep, (keyof ISubscriptionFormData)[]> = {
    basic: ['subscriptionName', 'billingCycle', 'status', 'startDate'],
    limits: ['maxCondominiums', 'maxUnits', 'maxUsers', 'maxStorageGb'],
    pricing: ['basePrice'],
    confirmation: [],
  }

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    // Create a copy to avoid mutating the original array
    const fields = [...stepFields[currentStep]]
    const statusValue = getValues('status')

    // Add trialEndsAt validation if status is trial
    if (currentStep === 'basic' && statusValue === 'trial') {
      fields.push('trialEndsAt')
    }

    // Block advancement from pricing step if there's a pricing error (e.g., no rates configured)
    if (currentStep === 'pricing') {
      const hasPricingError = getValues('pricingError')
      if (hasPricingError) {
        return false
      }
    }

    if (fields.length === 0) return true
    return await trigger(fields)
  }, [currentStep, trigger, getValues])

  const goToNextStep = useCallback(async () => {
    // Check for pricing error before validation to show appropriate toast
    if (currentStep === 'pricing') {
      const hasPricingError = getValues('pricingError')
      if (hasPricingError) {
        toast.error(t('superadmin.companies.subscription.form.pricing.resetNoRates'))
        return
      }
    }

    const isValid = await validateCurrentStep()
    if (isValid && currentStepIndex < STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      setTouchedSteps((prev) => new Set([...Array.from(prev), nextIndex]))
    }
  }, [currentStepIndex, currentStep, validateCurrentStep, getValues, toast, t])

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [currentStepIndex])

  const goToStep = useCallback(
    async (step: TSubscriptionStep) => {
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
      setTouchedSteps((prev) => new Set([...Array.from(prev), targetIndex]))
    },
    [currentStepIndex, trigger]
  )

  // Build subscription data from form values
  const buildSubscriptionData = useCallback((data: ISubscriptionFormData): TManagementCompanySubscriptionCreate => {
    return {
      managementCompanyId: companyId,
      subscriptionName: data.subscriptionName || null,
      billingCycle: data.billingCycle,
      basePrice: parseFloat(data.basePrice),
      currencyId: null,
      maxCondominiums: parseInt(data.maxCondominiums),
      maxUnits: parseInt(data.maxUnits),
      maxUsers: parseInt(data.maxUsers),
      maxStorageGb: parseInt(data.maxStorageGb),
      customFeatures:
        Object.keys(data.customFeatures).length > 0 ? data.customFeatures : null,
      customRules: null,
      status: data.status,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      nextBillingDate: null,
      trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
      autoRenew: data.autoRenew,
      notes: data.notes || null,
      createdBy,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      // Pricing details for historical record
      pricingCondominiumCount: data.pricingCondominiumCount,
      pricingUnitCount: data.pricingUnitCount,
      pricingCondominiumRate: data.pricingCondominiumRate,
      pricingUnitRate: data.pricingUnitRate,
      calculatedPrice: data.calculatedPrice,
      discountType: data.discountType === 'none' ? null : data.discountType,
      discountValue: data.discountValue ? parseFloat(data.discountValue) : null,
      discountAmount: data.discountAmount,
      pricingNotes: data.pricingNotes || null,
      rateId: data.rateId,
    }
  }, [companyId, createdBy])

  const handleSubmit = useCallback(() => {
    rhfHandleSubmit((data) => {
      const subscriptionData = buildSubscriptionData(data)

      // If there's an active subscription, show replacement modal
      if (activeSubscription) {
        pendingSubscriptionDataRef.current = subscriptionData
        setShowReplaceModal(true)
        return
      }

      // No active subscription, create directly
      createSubscription(subscriptionData)
    })()
  }, [rhfHandleSubmit, buildSubscriptionData, activeSubscription, createSubscription])

  // Handle confirmed replacement (cancel old + create new)
  const handleConfirmReplacement = useCallback(() => {
    if (!activeSubscription || !pendingSubscriptionDataRef.current) return

    setIsReplacing(true)
    setShowReplaceModal(false)

    // Cancel the current subscription, which will trigger creation of the new one on success
    cancelSubscription({
      cancelledBy: createdBy,
      cancellationReason: t('superadmin.companies.subscription.replace.autoReason'),
    })
  }, [activeSubscription, cancelSubscription, createdBy, t])

  // Close replacement modal
  const handleCloseReplaceModal = useCallback(() => {
    setShowReplaceModal(false)
    pendingSubscriptionDataRef.current = null
  }, [])

  const shouldShowError = useCallback(
    (field: keyof ISubscriptionFormData): boolean => {
      return !!errors[field] && touchedSteps.has(currentStepIndex)
    },
    [errors, touchedSteps, currentStepIndex]
  )

  const translateError = useCallback(
    (field: keyof ISubscriptionFormData): string | undefined => {
      const error = errors[field]
      if (!error?.message) return undefined
      return error.message as string
    },
    [errors]
  )

  const steps = useMemo(
    () => STEPS.map((step) => ({ key: step, title: t(`superadmin.companies.subscription.form.steps.${step}`) })),
    [t]
  )

  return {
    form,
    companyId,
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
    // Replacement modal state
    showReplaceModal,
    activeSubscription,
    handleConfirmReplacement,
    handleCloseReplaceModal,
    isReplacing,
  }
}
