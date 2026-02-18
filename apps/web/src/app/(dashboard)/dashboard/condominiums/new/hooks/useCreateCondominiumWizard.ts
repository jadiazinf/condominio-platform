'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

import { useAuth, useTranslation } from '@/contexts'
import type { TBulkGenerationConfig } from '../components/BulkBuildingGeneratorModal'
import { useToast } from '@/ui/components/toast'
import { translateApiError } from '@/utils/translateApiError'
import {
  useGenerateCondominiumCode,
} from '@packages/http-client'
import {
  createCondominiumWizard,
  type TWizardBuildingInput,
} from '@packages/http-client/hooks'

// ============================================================================
// Types
// ============================================================================

export type TWizardStep = 'condominium' | 'buildings' | 'units' | 'review'

const STEPS: TWizardStep[] = ['condominium', 'buildings', 'units', 'review']

export interface TLocalBuilding {
  tempId: string
  name: string
  code?: string | null
  floorsCount?: number | null
}

export interface TLocalUnit {
  tempId: string
  buildingTempId: string
  unitNumber: string
  floor?: number | null
  areaM2?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  parkingSpaces?: number
  parkingIdentifiers?: string[] | null
  storageIdentifier?: string | null
  aliquotPercentage?: string | null
}

export type TSubmissionStatus = 'idle' | 'submitting' | 'success' | 'partial_error' | 'error'

export interface TSubmissionState {
  status: TSubmissionStatus
  currentAction: string
  progress: {
    condominiumCreated: boolean
    buildingsTotal: number
    buildingsCreated: number
    unitsTotal: number
    unitsCreated: number
  }
  errors: string[]
  condominiumId?: string
}

// ============================================================================
// Form Schema (Step 1 - Condominium Info)
// ============================================================================

const condominiumStepSchema = z.object({
  name: z.string().min(1, 'superadmin.condominiums.form.validation.name.required').max(255),
  code: z.string().min(1, 'superadmin.condominiums.form.validation.code.required').max(50),
  managementCompanyIds: z
    .array(z.string().uuid())
    .min(1, 'superadmin.condominiums.form.validation.managementCompany.required'),
  address: z.string().min(1, 'superadmin.condominiums.form.validation.address.required').max(500),
  locationId: z
    .string({ error: 'superadmin.condominiums.form.validation.location.required' })
    .uuid('superadmin.condominiums.form.validation.location.required'),
  email: z
    .string()
    .min(1, 'superadmin.condominiums.form.validation.email.required')
    .email('superadmin.condominiums.form.validation.email.invalid')
    .max(255),
  phone: z.string().min(1, 'superadmin.condominiums.form.validation.phone.required').max(50),
  phoneCountryCode: z
    .string()
    .min(1, 'superadmin.condominiums.form.validation.phoneCountryCode.required')
    .max(10),
})

export type TCondominiumFormValues = z.infer<typeof condominiumStepSchema>

// ============================================================================
// Hook Options
// ============================================================================

interface UseCreateCondominiumWizardOptions {
  adminCompanyId?: string
  onSuccess?: () => void
}

// ============================================================================
// Hook
// ============================================================================

export function useCreateCondominiumWizard(options: UseCreateCondominiumWizardOptions = {}) {
  const { adminCompanyId } = options
  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<TWizardStep>('condominium')
  const [buildings, setBuildings] = useState<TLocalBuilding[]>([])
  const [units, setUnits] = useState<Map<string, TLocalUnit[]>>(new Map())
  const [validatedSteps, setValidatedSteps] = useState<Set<TWizardStep>>(new Set())

  const [bulkConfig, setBulkConfig] = useState<TBulkGenerationConfig | null>(null)

  const [submissionState, setSubmissionState] = useState<TSubmissionState>({
    status: 'idle',
    currentAction: '',
    progress: {
      condominiumCreated: false,
      buildingsTotal: 0,
      buildingsCreated: 0,
      unitsTotal: 0,
      unitsCreated: 0,
    },
    errors: [],
  })

  const form = useForm<TCondominiumFormValues>({
    resolver: zodResolver(condominiumStepSchema) as Resolver<TCondominiumFormValues>,
    defaultValues: {
      name: '',
      code: '',
      managementCompanyIds: adminCompanyId ? [adminCompanyId] : [],
      address: '',
      locationId: '',
      email: '',
      phone: '',
      phoneCountryCode: '+58',
    },
    mode: 'onBlur',
  })

  // Generate code mutation
  const generateCodeMutation = useGenerateCondominiumCode({
    onSuccess: (data) => {
      form.setValue('code', data.code, { shouldValidate: true })
      toast.success(t('superadmin.condominiums.form.codeGenerated'))
    },
    onError: (error: Error) => {
      toast.error(translateApiError(error, t))
    },
  })

  const handleGenerateCode = useCallback(() => {
    generateCodeMutation.mutate()
  }, [generateCodeMutation])

  const currentStepIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  // ============================================================================
  // Building CRUD (local state only)
  // ============================================================================

  const addBuilding = useCallback((building: Omit<TLocalBuilding, 'tempId'>) => {
    const newBuilding: TLocalBuilding = {
      ...building,
      tempId: crypto.randomUUID(),
    }
    setBuildings((prev) => [...prev, newBuilding])
    return newBuilding.tempId
  }, [])

  const addBulkBuildings = useCallback((bulkBuildings: Omit<TLocalBuilding, 'tempId'>[]): TLocalBuilding[] => {
    const newBuildings = bulkBuildings.map((b) => ({ ...b, tempId: crypto.randomUUID() }))
    setBuildings((prev) => [...prev, ...newBuildings])
    return newBuildings
  }, [])

  const updateBuilding = useCallback(
    (tempId: string, data: Partial<Omit<TLocalBuilding, 'tempId'>>) => {
      setBuildings((prev) =>
        prev.map((b) => (b.tempId === tempId ? { ...b, ...data } : b))
      )
    },
    []
  )

  const removeBuilding = useCallback(
    (tempId: string) => {
      setBuildings((prev) => prev.filter((b) => b.tempId !== tempId))
      setUnits((prev) => {
        const next = new Map(prev)
        next.delete(tempId)
        return next
      })
    },
    []
  )

  const clearAllBuildings = useCallback(() => {
    setBuildings([])
    setUnits(new Map())
    setBulkConfig(null)
  }, [])

  // ============================================================================
  // Unit CRUD (local state only)
  // ============================================================================

  const addUnit = useCallback((unit: Omit<TLocalUnit, 'tempId'>) => {
    const newUnit: TLocalUnit = {
      ...unit,
      tempId: crypto.randomUUID(),
    }
    setUnits((prev) => {
      const next = new Map(prev)
      const existing = next.get(unit.buildingTempId) || []
      next.set(unit.buildingTempId, [...existing, newUnit])
      return next
    })
    return newUnit.tempId
  }, [])

  const addBulkUnits = useCallback((bulkUnits: Omit<TLocalUnit, 'tempId'>[]) => {
    setUnits((prev) => {
      const next = new Map(prev)
      for (const unit of bulkUnits) {
        const newUnit: TLocalUnit = { ...unit, tempId: crypto.randomUUID() }
        const existing = next.get(unit.buildingTempId) || []
        next.set(unit.buildingTempId, [...existing, newUnit])
      }
      return next
    })
  }, [])

  const updateUnit = useCallback(
    (buildingTempId: string, unitTempId: string, data: Partial<Omit<TLocalUnit, 'tempId' | 'buildingTempId'>>) => {
      setUnits((prev) => {
        const next = new Map(prev)
        const existing = next.get(buildingTempId) || []
        next.set(
          buildingTempId,
          existing.map((u) => (u.tempId === unitTempId ? { ...u, ...data } : u))
        )
        return next
      })
    },
    []
  )

  const removeUnit = useCallback((buildingTempId: string, unitTempId: string) => {
    setUnits((prev) => {
      const next = new Map(prev)
      const existing = next.get(buildingTempId) || []
      next.set(
        buildingTempId,
        existing.filter((u) => u.tempId !== unitTempId)
      )
      return next
    })
  }, [])

  const clearUnitsForBuilding = useCallback((buildingTempId: string) => {
    setUnits((prev) => {
      const next = new Map(prev)
      next.set(buildingTempId, [])
      return next
    })
  }, [])

  const getUnitsForBuilding = useCallback(
    (buildingTempId: string): TLocalUnit[] => {
      return units.get(buildingTempId) || []
    },
    [units]
  )

  const getTotalUnitsCount = useCallback((): number => {
    let count = 0
    units.forEach((unitList) => {
      count += unitList.length
    })
    return count
  }, [units])

  // ============================================================================
  // Step Validation
  // ============================================================================

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    setValidatedSteps((prev) => new Set(prev).add(currentStep))

    if (currentStep === 'condominium') {
      const isValid = await form.trigger()
      return isValid
    }

    if (currentStep === 'buildings') {
      if (buildings.length === 0) {
        toast.error(t('superadmin.condominiums.wizard.buildings.emptyDescription'))
        return false
      }
      // Validate each building has a name
      const invalidBuilding = buildings.find((b) => !b.name || b.name.trim() === '')
      if (invalidBuilding) {
        toast.error(t('superadmin.condominiums.wizard.buildings.nameRequired'))
        return false
      }
      return true
    }

    if (currentStep === 'units') {
      // Each building should have at least 1 unit
      for (const building of buildings) {
        const buildingUnits = units.get(building.tempId) || []
        if (buildingUnits.length === 0) {
          toast.error(
            `${building.name}: ${t('superadmin.condominiums.wizard.units.emptyDescription')}`
          )
          return false
        }
      }
      return true
    }

    // Review step — always valid
    return true
  }, [currentStep, form, buildings, units, toast, t])

  // ============================================================================
  // Navigation
  // ============================================================================

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

  const goToStep = useCallback(
    (step: TWizardStep) => {
      const targetIndex = STEPS.indexOf(step)
      // Allow going back freely, or going to current step
      if (targetIndex <= currentStepIndex) {
        setCurrentStep(step)
      }
    },
    [currentStepIndex]
  )

  // ============================================================================
  // Submission
  // ============================================================================

  const handleSubmit = useCallback(async () => {
    if (!firebaseUser) return

    const condominiumData = form.getValues()
    const totalUnits = getTotalUnitsCount()

    setSubmissionState({
      status: 'submitting',
      currentAction: t('superadmin.condominiums.wizard.submission.creatingCondominium'),
      progress: {
        condominiumCreated: false,
        buildingsTotal: buildings.length,
        buildingsCreated: 0,
        unitsTotal: totalUnits,
        unitsCreated: 0,
      },
      errors: [],
    })

    try {
      // Build wizard payload: condominium + buildings with nested units
      const wizardBuildings: TWizardBuildingInput[] = buildings.map(({ tempId, ...b }) => {
        const buildingUnits = units.get(tempId) || []
        return {
          ...b,
          units: buildingUnits.map(({ tempId: _uid, buildingTempId: _btid, parkingIdentifiers: _pi, storageIdentifier: _si, ...unit }) => unit),
        }
      })

      const result = await createCondominiumWizard({
        condominium: {
          name: condominiumData.name,
          code: condominiumData.code,
          managementCompanyIds: condominiumData.managementCompanyIds,
          address: condominiumData.address,
          locationId: condominiumData.locationId,
          email: condominiumData.email,
          phone: condominiumData.phone,
          phoneCountryCode: condominiumData.phoneCountryCode,
          defaultCurrencyId: null,
          isActive: true,
          metadata: null,
          createdBy: null,
        },
        buildings: wizardBuildings,
      })

      setSubmissionState({
        status: 'success',
        condominiumId: result.condominium.id,
        currentAction: t('superadmin.condominiums.wizard.submission.complete'),
        progress: {
          condominiumCreated: true,
          buildingsTotal: buildings.length,
          buildingsCreated: result.buildingsCreated,
          unitsTotal: totalUnits,
          unitsCreated: result.unitsCreated,
        },
        errors: [],
      })
      toast.success(t('superadmin.condominiums.wizard.submission.complete'))
    } catch (err) {
      const errorMessage = translateApiError(err, t)
      setSubmissionState((prev) => ({
        ...prev,
        status: 'error',
        currentAction: '',
        errors: [errorMessage],
      }))
      toast.error(errorMessage)
    }
  }, [
    firebaseUser,
    form,
    buildings,
    units,
    getTotalUnitsCount,
    toast,
    t,
  ])

  const navigateToCondominium = useCallback(() => {
    if (submissionState.condominiumId) {
      router.push(`/dashboard/condominiums/${submissionState.condominiumId}`)
    } else {
      router.push('/dashboard/condominiums')
    }
  }, [router, submissionState.condominiumId])

  const resetSubmission = useCallback(() => {
    setSubmissionState({
      status: 'idle',
      currentAction: '',
      progress: {
        condominiumCreated: false,
        buildingsTotal: 0,
        buildingsCreated: 0,
        unitsTotal: 0,
        unitsCreated: 0,
      },
      errors: [],
    })
  }, [])

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      return t(message)
    },
    [t]
  )

  return {
    // Form
    form,
    translateError,

    // Step navigation
    currentStep,
    currentStepIndex,
    totalSteps: STEPS.length,
    steps: STEPS,
    isFirstStep,
    isLastStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    validatedSteps,

    // Buildings
    buildings,
    addBuilding,
    addBulkBuildings,
    updateBuilding,
    removeBuilding,
    clearAllBuildings,
    bulkConfig,
    setBulkConfig,

    // Units
    units,
    addUnit,
    addBulkUnits,
    updateUnit,
    removeUnit,
    clearUnitsForBuilding,
    getUnitsForBuilding,
    getTotalUnitsCount,

    // Code generation
    handleGenerateCode,
    isGeneratingCode: generateCodeMutation.isPending,

    // Submission
    submissionState,
    handleSubmit,
    navigateToCondominium,
    resetSubmission,
    isSubmitting: submissionState.status === 'submitting',

    // Admin mode
    isAdminMode: !!adminCompanyId,
    adminCompanyId,
  }
}

export type TUseCreateCondominiumWizard = ReturnType<typeof useCreateCondominiumWizard>
