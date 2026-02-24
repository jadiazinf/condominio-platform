'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import {
  createUserWithInvitation,
  getCondominiumsPaginated,
  useRoleByName,
  useAssignableRoles,
  useRolePermissions,
  useAllPermissions,
  type TRoleOption,
} from '@packages/http-client/hooks'

import { useAuth, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'

export type TUserType = 'general' | 'condominium' | 'superadmin'
export type TUserFormStep =
  | 'basic'
  | 'userType'
  | 'condominium'
  | 'role'
  | 'permissions'
  | 'confirmation'

// Schema por pasos
const basicInfoSchema = z.object({
  email: z.string().min(1, 'common.required').email('common.invalidEmail'),
  firstName: z.string().min(1, 'common.required'),
  lastName: z.string().min(1, 'common.required'),
  phoneCountryCode: z.string().min(1, 'common.required'),
  phoneNumber: z.string().min(1, 'common.required'),
  idDocumentType: z.string().min(1, 'common.required'),
  idDocumentNumber: z.string().min(1, 'common.required'),
})

const userTypeSchema = basicInfoSchema.extend({
  userType: z.enum(['general', 'condominium', 'superadmin']),
})

// Schema for general users (no role, no condominium)
const generalUserSchema = userTypeSchema.extend({
  userType: z.literal('general'),
})

// Schema for condominium users (requires condominium + role)
const condominiumUserSchema = userTypeSchema.extend({
  userType: z.literal('condominium'),
  condominiumId: z.string().min(1, 'common.required'),
  roleId: z.string().min(1, 'common.required'),
  customPermissions: z.record(z.string(), z.boolean()).optional(),
})

// Schema for superadmin users (only custom permissions)
const superadminUserSchema = userTypeSchema.extend({
  userType: z.literal('superadmin'),
  customPermissions: z.record(z.string(), z.boolean()).optional(),
})

const fullSchema = z.discriminatedUnion('userType', [
  generalUserSchema,
  condominiumUserSchema,
  superadminUserSchema,
])

type TCreateUserFormData = z.infer<typeof fullSchema>

interface ICondominium {
  id: string
  name: string
  code: string | null
  address: string | null
}

interface IRolePermission {
  id: string
  permissionId: string
  name: string
  action: string
  module: string
  description?: string
}

export function useCreateUserForm() {
  const { user: firebaseUser } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<TUserFormStep>('basic')
  const [token, setToken] = useState<string>('')

  const [condominiums, setCondominiums] = useState<ICondominium[]>([])
  const [customPermissions, setCustomPermissions] = useState<Map<string, boolean>>(new Map())

  const [isLoadingCondominiums, setIsLoadingCondominiums] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pagination state for condominiums
  const [condominiumPage, setCondominiumPage] = useState(1)
  const [condominiumLimit, setCondominiumLimit] = useState(20)
  const [condominiumTotal, setCondominiumTotal] = useState(0)
  const [condominiumTotalPages, setCondominiumTotalPages] = useState(0)
  const [condominiumSearch, setCondominiumSearch] = useState('')

  const form = useForm<TCreateUserFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phoneCountryCode: '+58',
      phoneNumber: '',
      idDocumentType: 'V',
      idDocumentNumber: '',
      userType: undefined,
      condominiumId: '',
      roleId: '',
      customPermissions: {},
    } as any,
    mode: 'onChange',
  })

  const { watch } = form
  const selectedUserType = watch('userType')
  const selectedRoleId = watch('roleId' as any)

  // Get auth token
  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setToken)
    }
  }, [firebaseUser])

  // Clean up form fields when user type changes to prevent stale data
  useEffect(() => {
    if (!selectedUserType) return

    // Clear fields that don't belong to the selected user type
    if (selectedUserType === 'general') {
      // General users: clear condominium, role, and custom permissions
      form.setValue('condominiumId' as any, '', { shouldValidate: false })
      form.setValue('roleId' as any, '', { shouldValidate: false })
      form.setValue('customPermissions' as any, {}, { shouldValidate: false })
    } else if (selectedUserType === 'superadmin') {
      // Superadmin users: clear condominium and role (keep custom permissions)
      form.setValue('condominiumId' as any, '', { shouldValidate: false })
      form.setValue('roleId' as any, '', { shouldValidate: false })
    }
    // For 'condominium' type, we keep the fields but they'll be filled in the flow
  }, [selectedUserType, form])

  // Determine dynamic steps based on user type
  const steps = useMemo((): TUserFormStep[] => {
    const baseSteps: TUserFormStep[] = ['basic', 'userType']

    if (selectedUserType === 'general') {
      return [...baseSteps, 'confirmation']
    }

    if (selectedUserType === 'condominium') {
      return [...baseSteps, 'condominium', 'role', 'permissions', 'confirmation']
    }

    if (selectedUserType === 'superadmin') {
      return [...baseSteps, 'permissions', 'confirmation']
    }

    return baseSteps
  }, [selectedUserType])

  // Fetch USER role for general and superadmin users
  const { data: userRoleData, isLoading: isLoadingUserRole } = useRoleByName({
    token,
    roleName: 'USER',
    enabled: !!token && (selectedUserType === 'general' || selectedUserType === 'superadmin'),
  })

  // Fetch assignable roles for condominium users
  const { data: assignableRolesData, isLoading: isLoadingAssignableRoles } = useAssignableRoles({
    token,
    enabled: !!token && selectedUserType === 'condominium',
  })

  // Fetch role permissions for condominium users
  const { data: rolePermissionsData, isLoading: isLoadingRolePermissions } = useRolePermissions({
    token,
    roleId: selectedRoleId || '',
    enabled: !!token && selectedUserType === 'condominium' && !!selectedRoleId,
  })

  // Fetch all permissions for superadmin users
  const { data: allPermissionsData, isLoading: isLoadingAllPermissions } = useAllPermissions({
    token,
    enabled: !!token && selectedUserType === 'superadmin',
  })

  // Extract roles from assignable roles data
  const roles: TRoleOption[] = useMemo(() => {
    return assignableRolesData?.data || []
  }, [assignableRolesData])

  // Extract role permissions (pure, no side effects)
  const rolePermissions: IRolePermission[] = useMemo(() => {
    if (!rolePermissionsData?.data) return []
    return rolePermissionsData.data as any
  }, [rolePermissionsData])

  // Extract superadmin permissions (pure, no side effects)
  const superadminPermissions: IRolePermission[] = useMemo(() => {
    if (!allPermissionsData?.data) return []
    return allPermissionsData.data.map((p: any) => ({
      id: p.id,
      permissionId: p.id,
      name: p.name,
      action: p.action,
      module: p.module,
      description: p.description,
    }))
  }, [allPermissionsData])

  // Initialize permissions when data loads or user type/role changes
  useEffect(() => {
    // Reset permissions when user type or role changes
    setCustomPermissions(new Map())

    // Initialize with all permissions enabled for condominium users
    if (selectedUserType === 'condominium' && rolePermissions.length > 0) {
      const permissionsMap = new Map<string, boolean>()
      rolePermissions.forEach((p: any) => {
        permissionsMap.set(p.permissionId, true)
      })
      setCustomPermissions(permissionsMap)
    }

    // Initialize with all permissions enabled for superadmin users
    if (selectedUserType === 'superadmin' && superadminPermissions.length > 0) {
      const permissionsMap = new Map<string, boolean>()
      superadminPermissions.forEach((p: any) => {
        permissionsMap.set(p.id, true)
      })
      setCustomPermissions(permissionsMap)
    }
  }, [selectedUserType, selectedRoleId, rolePermissions, superadminPermissions])

  // Load condominiums with pagination when userType is condominium
  useEffect(() => {
    if (selectedUserType === 'condominium' && token) {
      setIsLoadingCondominiums(true)
      getCondominiumsPaginated(token, {
        page: condominiumPage,
        limit: condominiumLimit,
        search: condominiumSearch || undefined,
      })
        .then(result => {
          console.log('Condominiums API response:', result)
          if (result && result.data) {
            setCondominiums(result.data)
            if (result.pagination) {
              console.log('Setting pagination:', result.pagination)
              setCondominiumTotal(result.pagination.total)
              setCondominiumTotalPages(result.pagination.totalPages)
            } else {
              console.warn('No pagination data in response')
            }
          }
        })
        .catch(error => {
          console.error('Error fetching condominiums:', error)
          toast.error(t('superadmin.users.create.errors.condominiumsFetch'))
        })
        .finally(() => {
          setIsLoadingCondominiums(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserType, token, condominiumPage, condominiumLimit, condominiumSearch])

  // Get current step index
  const currentStepIndex = steps.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const values = form.getValues()

    try {
      if (currentStep === 'basic') {
        basicInfoSchema.parse(values)
        return true
      }

      if (currentStep === 'userType') {
        userTypeSchema.parse(values)
        return true
      }

      if (currentStep === 'condominium') {
        if (values.userType === 'condominium' && !values.condominiumId) {
          form.setError('condominiumId' as any, {
            type: 'manual',
            message: 'common.required',
          })
          return false
        }
        return true
      }

      if (currentStep === 'role') {
        if (values.userType === 'condominium' && !values.roleId) {
          form.setError('roleId' as any, {
            type: 'manual',
            message: 'common.required',
          })
          return false
        }
        return true
      }

      if (currentStep === 'permissions') {
        return true
      }

      if (currentStep === 'confirmation') {
        // Confirmation step doesn't require validation, just review
        return true
      }

      return false
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach(err => {
          form.setError(err.path.join('.') as any, {
            type: 'manual',
            message: err.message,
          })
        })
      }
      return false
    }
  }, [currentStep, form])

  // Navigation functions
  const handleNext = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])
    }
  }, [validateCurrentStep, currentStepIndex, steps, currentStep])

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1])
    }
  }, [currentStepIndex, steps])

  const handleStepClick = useCallback(
    (step: TUserFormStep) => {
      const stepIndex = steps.indexOf(step)
      if (stepIndex !== -1 && stepIndex <= currentStepIndex) {
        setCurrentStep(step)
      }
    },
    [currentStepIndex, steps]
  )

  const canGoToStep = useCallback(
    (step: TUserFormStep) => {
      const stepIndex = steps.indexOf(step)
      return stepIndex !== -1 && stepIndex <= currentStepIndex
    },
    [currentStepIndex, steps]
  )

  // Toggle permission
  const togglePermission = useCallback((permissionId: string) => {
    setCustomPermissions(prev => {
      const newMap = new Map(prev)
      newMap.set(permissionId, !newMap.get(permissionId))
      return newMap
    })
  }, [])

  // Group permissions by module
  const permissionsByModule = useCallback(() => {
    const permissions = selectedUserType === 'superadmin' ? superadminPermissions : rolePermissions

    const grouped: Record<string, IRolePermission[]> = {}
    permissions.forEach(permission => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = []
      }
      grouped[permission.module].push(permission)
    })

    // Convert to array format expected by components
    return Object.entries(grouped).map(([module, perms]) => ({
      module,
      permissions: perms.map(p => ({
        id: p.permissionId,
        action: p.action,
        name: p.name,
        description: p.description,
        granted: customPermissions.get(p.permissionId) ?? true,
      })),
    }))
  }, [selectedUserType, rolePermissions, superadminPermissions, customPermissions])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!firebaseUser) return

    const values = form.getValues()

    // Helper to extract error message from API response
    const getErrorMessage = (error: any): string => {
      // Check if it's an API error with a message
      if (error?.response?.data?.error) {
        return error.response.data.error
      }

      // Check for validation errors array
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        return error.response.data.errors.map((e: any) => e.message).join(', ')
      }

      // Check for error message in various formats
      if (error?.message) {
        return error.message
      }

      // Fallback to generic error
      return t('superadmin.users.create.error')
    }

    // Create the submission promise
    const submitPromise = (async () => {
      const authToken = await firebaseUser.getIdToken()

      // Generate displayName from firstName and lastName
      const displayName = `${values.firstName} ${values.lastName}`.trim()

      // Build payload based on user type
      let roleId: string
      let condominiumId: string | null = null
      let permissionIds: string[] = []

      if (values.userType === 'condominium') {
        roleId = values.roleId
        condominiumId = values.condominiumId

        // Collect enabled custom permissions for condominium users
        permissionIds = Array.from(customPermissions.entries())
          .filter(([_, enabled]) => enabled)
          .map(([permissionId]) => permissionId)
      } else if (values.userType === 'general') {
        // For general users, assign the USER role
        const userRole = userRoleData?.data?.id
        if (!userRole) {
          throw new Error(t('superadmin.users.create.errors.userRoleNotFound'))
        }
        roleId = userRole
        condominiumId = null
        permissionIds = []
      } else {
        // Superadmin users - collect enabled custom permissions
        const userRole = userRoleData?.data?.id
        if (!userRole) {
          throw new Error(t('superadmin.users.create.errors.userRoleNotFound'))
        }
        roleId = userRole
        condominiumId = null
        permissionIds = Array.from(customPermissions.entries())
          .filter(([_, enabled]) => enabled)
          .map(([permissionId]) => permissionId)
      }

      // Call the unified endpoint
      const result = await createUserWithInvitation(authToken, {
        email: values.email,
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        displayName: displayName || null,
        phoneCountryCode: values.phoneCountryCode || null,
        phoneNumber: values.phoneNumber || null,
        idDocumentType: (values.idDocumentType || null) as any,
        idDocumentNumber: values.idDocumentNumber || null,
        condominiumId,
        roleId,
        customPermissions: permissionIds.length > 0 ? permissionIds : undefined,
        expirationDays: 7,
      })

      return result
    })()

    // Use toast.promise for better UX
    setIsSubmitting(true)
    try {
      await toast.promise(submitPromise, {
        loading: t('superadmin.users.create.submitting'),
        success: t('superadmin.users.create.success'),
        error: err => getErrorMessage(err),
      })

      // Navigate to users list on success
      router.push('/dashboard/users')
    } catch (error) {
      // Error is already handled by toast.promise
      console.error('Error creating user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [firebaseUser, form, router, t, toast, userRoleData])

  const translateError = useCallback(
    (message: string | undefined): string | undefined => {
      if (!message) return undefined
      const translated = t(message)
      // If translation key is returned as-is, it means translation doesn't exist
      // Return a fallback message
      if (translated === message) {
        if (message === 'common.required') return 'Este campo es requerido'
        if (message === 'common.invalidEmail') return 'Email inválido'
        return translated
      }
      return translated
    },
    [t]
  )

  const selectedCondominiumId = watch('condominiumId' as any)

  const canGoNext =
    currentStep === 'basic' ||
    (currentStep === 'userType' && !!selectedUserType) ||
    (currentStep === 'condominium' && !!selectedCondominiumId) ||
    (currentStep === 'role' && !!selectedRoleId) ||
    currentStep === 'permissions' ||
    currentStep === 'confirmation'

  const canSubmit = isLastStep && currentStep === 'confirmation'

  // Convert customPermissions Map to object for components
  const customPermissionsObj = Object.fromEntries(customPermissions)

  // Aggregate loading states
  const isLoadingRoles = isLoadingAssignableRoles
  const isLoadingPermissions = isLoadingRolePermissions || isLoadingAllPermissions

  // Condominium pagination handlers
  const handleCondominiumPageChange = useCallback((page: number) => {
    setCondominiumPage(page)
  }, [])

  const handleCondominiumLimitChange = useCallback((limit: number) => {
    setCondominiumLimit(limit)
    setCondominiumPage(1) // Reset to first page when limit changes
  }, [])

  const handleCondominiumSearchChange = useCallback((search: string) => {
    setCondominiumSearch(search)
    setCondominiumPage(1) // Reset to first page when search changes
  }, [])

  return {
    form,
    currentStep,
    steps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    canGoNext,
    canGoBack: !isFirstStep,
    canSubmit,

    // Data
    selectedUserType,
    roles,
    condominiums,
    rolePermissions: permissionsByModule(),
    customPermissions: customPermissionsObj,

    // Loading states
    isLoadingRoles,
    isLoadingCondominiums,
    isLoadingPermissions,

    // Condominium pagination
    condominiumPage,
    condominiumLimit,
    condominiumTotal,
    condominiumTotalPages,
    condominiumSearch,
    onCondominiumPageChange: handleCondominiumPageChange,
    onCondominiumLimitChange: handleCondominiumLimitChange,
    onCondominiumSearchChange: handleCondominiumSearchChange,

    // Navigation
    handleNext,
    handlePrevious,
    goToStep: handleStepClick,
    canGoToStep,

    // Actions
    handleSubmit,
    togglePermission,
    translateError,
  }
}
