'use client'

import { useState } from 'react'

import { updateUserRoleStatusAction } from '../../actions'

import { Switch } from '@/ui/components/switch'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'

interface RoleStatusToggleProps {
  userId: string
  userRoleId: string
  roleName: string
  condominiumName?: string
  initialStatus: boolean
  activeLabel: string
  inactiveLabel: string
  successMessage: string
  errorMessage: string
  size?: 'sm' | 'md' | 'lg'
}

export function RoleStatusToggle({
  userId,
  userRoleId,
  roleName,
  condominiumName,
  initialStatus,
  activeLabel,
  inactiveLabel,
  successMessage,
  errorMessage,
  size = 'sm',
}: RoleStatusToggleProps) {
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
    <div className="flex items-center justify-between py-3 border-b border-default-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Typography className="font-medium" variant="body1">
            {roleName}
          </Typography>
          {condominiumName && (
            <Chip color="default" size="sm" variant="flat">
              {condominiumName}
            </Chip>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Chip color={isActive ? 'success' : 'default'} size="sm" variant="flat">
          {isActive ? activeLabel : inactiveLabel}
        </Chip>
        <Switch
          isDisabled={isLoading}
          isSelected={isActive}
          size={size}
          onValueChange={handleToggle}
        />
      </div>
    </div>
  )
}
