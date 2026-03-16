'use client'

import { useState } from 'react'

import { updateUserRoleStatusAction } from '../../actions'

import { Switch } from '@/ui/components/switch'
import { Chip } from '@/ui/components/chip'
import { useToast } from '@/ui/components/toast'

interface CondominiumRoleToggleProps {
  userId: string
  userRoleId: string
  roleName: string
  initialStatus: boolean
  activeLabel: string
  inactiveLabel: string
  successMessage: string
  errorMessage: string
}

export function CondominiumRoleToggle({
  userId,
  userRoleId,
  roleName,
  initialStatus,
  activeLabel,
  inactiveLabel,
  successMessage,
  errorMessage,
}: CondominiumRoleToggleProps) {
  const [isActive, setIsActive] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    try {
      const result = await updateUserRoleStatusAction(userId, userRoleId, checked)

      if (result.success) {
        setIsActive(checked)
        toast.success(result.message || successMessage)
      } else {
        toast.error(result.error || errorMessage)
      }
    } catch (error) {
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Chip color={isActive ? 'primary' : 'default'} size="sm" variant="flat">
        {roleName}
      </Chip>
      <Switch isDisabled={isLoading} isSelected={isActive} size="sm" onValueChange={handleToggle} />
    </div>
  )
}
