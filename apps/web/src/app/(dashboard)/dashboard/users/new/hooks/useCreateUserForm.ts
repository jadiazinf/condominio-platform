'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { EIdDocumentTypes } from '@packages/domain'
import { createUserInvitation, getAllCondominiums } from '@packages/http-client/hooks'
import { HttpError } from '@packages/http-client'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export type TFormStep = 'basicInfo' | 'roleAssignment' | 'confirmation'

const STEPS: TFormStep[] = ['basicInfo', 'roleAssignment', 'confirmation']

type TIdDocumentType = (typeof EIdDocumentTypes)[number]

export interface IFormData {
  // Basic info
  email: string
  firstName: string
  lastName: string
  displayName: string
  phoneCountryCode: string
  phoneNumber: string
  idDocumentType: TIdDocumentType | null
  idDocumentNumber: string
  // Role assignment
  roleId: string
  condominiumId: string
}

export interface IRole {
  id: string
  name: string
  isSystemRole: boolean
}

export interface ICondominium {
  id: string
  name: string
}

interface UseCreateUserFormOptions {
  roles: IRole[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

const initialFormData: IFormData = {
  email: '',
  firstName: '',
  lastName: '',
  displayName: '',
  phoneCountryCode: '+58',
  phoneNumber: '',
  idDocumentType: null,
  idDocumentNumber: '',
  roleId: '',
  condominiumId: '',
}

export function useCreateUserForm(options: UseCreateUserFormOptions) {
  const { roles } = options
  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<TFormStep>('basicInfo')
  const [formData, setFormData] = useState<IFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof IFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [condominiums, setCondominiums] = useState<ICondominium[]>([])
  const [isLoadingCondominiums, setIsLoadingCondominiums] = useState(false)
  const [token, setToken] = useState<string>('')

  // Get token
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Fetch condominiums when token is available
  useEffect(() => {
    if (!token) return

    const fetchCondominiums = async () => {
      setIsLoadingCondominiums(true)
      try {
        const result = await getAllCondominiums(token)
        setCondominiums(result || [])
      } catch (error) {
        console.error('Error fetching condominiums:', error)
      } finally {
        setIsLoadingCondominiums(false)
      }
    }

    fetchCondominiums()
  }, [token])

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  // Check if selected role is SUPERADMIN (doesn't require condominium)
  const selectedRole = roles.find(r => r.id === formData.roleId)
  const isGlobalRole = selectedRole?.isSystemRole && selectedRole?.name === 'SUPERADMIN'
  const requiresCondominium = !isGlobalRole && formData.roleId !== ''

  const updateField = useCallback(<K extends keyof IFormData>(field: K, value: IFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const validateBasicInfoStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof IFormData, string>> = {}

    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = t('validation.users.email.invalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, t])

  const validateRoleAssignmentStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof IFormData, string>> = {}

    if (!formData.roleId) {
      newErrors.roleId = t('superadmin.users.create.validation.roleRequired')
    }

    if (requiresCondominium && !formData.condominiumId) {
      newErrors.condominiumId = t('superadmin.users.create.validation.condominiumRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, requiresCondominium, t])

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'basicInfo':
        return validateBasicInfoStep()
      case 'roleAssignment':
        return validateRoleAssignmentStep()
      case 'confirmation':
        return true
      default:
        return true
    }
  }, [currentStep, validateBasicInfoStep, validateRoleAssignmentStep])

  const goToNextStep = useCallback(() => {
    const isValid = validateCurrentStep()
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
    const stepIndex = STEPS.indexOf(step)
    // Only allow going to previous steps or current step
    if (stepIndex <= currentStepIndex) {
      setCurrentStep(step)
    }
  }, [currentStepIndex])

  const handleSubmit = useCallback(async () => {
    if (!token) {
      toast.error(t('common.error'))
      return
    }

    setIsSubmitting(true)

    try {
      await createUserInvitation(token, {
        email: formData.email,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        displayName: formData.displayName || null,
        phoneCountryCode: formData.phoneCountryCode || null,
        phoneNumber: formData.phoneNumber || null,
        idDocumentType: formData.idDocumentType || null,
        idDocumentNumber: formData.idDocumentNumber || null,
        condominiumId: requiresCondominium ? formData.condominiumId : null,
        roleId: formData.roleId,
      })

      toast.success(t('superadmin.users.create.success'))
      options.onSuccess?.()
      router.push('/dashboard/users')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')

      if (HttpError.isHttpError(err)) {
        toast.error(err.message)
      } else {
        toast.error(t('superadmin.users.create.error'))
      }

      options.onError?.(error)
    } finally {
      setIsSubmitting(false)
    }
  }, [token, formData, requiresCondominium, toast, t, options, router])

  // Helper to get role display name with translation fallback
  const getRoleLabel = useCallback(
    (roleName: string) => {
      const translationKey = `superadmin.users.roles.${roleName}`
      const translated = t(translationKey)
      return translated === translationKey ? roleName : translated
    },
    [t]
  )

  return {
    // Form state
    formData,
    errors,
    updateField,
    // Steps
    currentStep,
    currentStepIndex,
    totalSteps: STEPS.length,
    isFirstStep,
    isLastStep,
    steps: STEPS,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    // Submission
    isSubmitting,
    handleSubmit,
    // Data
    roles,
    condominiums,
    isLoadingCondominiums,
    requiresCondominium,
    selectedRole,
    getRoleLabel,
  }
}
