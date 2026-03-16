'use client'

import { X } from 'lucide-react'
import { cn } from '@heroui/theme'

import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'

interface IClearFiltersButtonProps {
  onClear: () => void
  className?: string
  isDisabled?: boolean
}

export function ClearFiltersButton({
  onClear,
  className,
  isDisabled = false,
}: IClearFiltersButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      className={cn('min-w-fit', className)}
      isDisabled={isDisabled}
      startContent={<X size={16} />}
      variant="flat"
      onPress={onClear}
    >
      {t('common.clearFilters')}
    </Button>
  )
}
