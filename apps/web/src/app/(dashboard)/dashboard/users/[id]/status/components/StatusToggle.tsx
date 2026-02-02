'use client'

import { useState } from 'react'
import { Switch } from '@/ui/components/switch'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { updateUserStatusAction } from '../../actions'

interface StatusToggleProps {
  userId: string
  initialStatus: boolean
  activeLabel: string
  inactiveLabel: string
  title: string
  description: string
  successMessage: string
  errorMessage: string
}

export function StatusToggle({
  userId,
  initialStatus,
  activeLabel,
  inactiveLabel,
  title,
  description,
  successMessage,
  errorMessage,
}: StatusToggleProps) {
  const [isActive, setIsActive] = useState(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    try {
      const result = await updateUserStatusAction(userId, checked)

      if (result.success) {
        setIsActive(checked)
        toast.success(successMessage)
      } else {
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Typography variant="h4">{title}</Typography>
        <Typography color="muted" variant="body2" className="mt-1">
          {description}
        </Typography>
      </div>
      <div className="flex items-center gap-4">
        <Chip color={isActive ? 'success' : 'default'} variant="flat">
          {isActive ? activeLabel : inactiveLabel}
        </Chip>
        <Switch
          isSelected={isActive}
          isDisabled={isLoading}
          onValueChange={handleToggle}
        />
      </div>
    </div>
  )
}
