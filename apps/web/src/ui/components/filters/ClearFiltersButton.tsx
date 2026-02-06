'use client'

import { X } from 'lucide-react'
import { Button } from '@/ui/components/button'
import { useTranslation } from '@/contexts'
import { cn } from '@heroui/theme'

interface IClearFiltersButtonProps {
  onClear: () => void
  className?: string
  isDisabled?: boolean
}

export function ClearFiltersButton({ onClear, className, isDisabled = false }: IClearFiltersButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      className={cn('min-w-fit', className)}
      startContent={<X size={16} />}
      variant="flat"
      onPress={onClear}
      isDisabled={isDisabled}
    >
      {t('common.clearFilters')}
    </Button>
  )
}
