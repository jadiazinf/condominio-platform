'use client'

import { Pagination as HeroUIPagination } from '@heroui/pagination'
import { Select, type ISelectItem } from '@/ui/components/select'
import { cn } from '@heroui/theme'
import { useMemo } from 'react'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  showLimitSelector?: boolean
  limitOptions?: number[]
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  limitOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)

  const limitItems: ISelectItem[] = useMemo(
    () => limitOptions.map(option => ({ key: String(option), label: String(option) })),
    [limitOptions]
  )

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-4">
        {showLimitSelector && onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Mostrar</span>
            <Select
              aria-label="Items per page"
              className="w-20"
              items={limitItems}
              value={String(limit)}
              onChange={key => {
                if (key) onLimitChange(Number(key))
              }}
              variant="bordered"
            />
          </div>
        )}
        <span className="text-sm text-default-500">
          {total > 0 ? `${startItem}-${endItem} de ${total}` : 'Sin resultados'}
        </span>
      </div>

      <HeroUIPagination
        color="primary"
        isDisabled={totalPages <= 1}
        page={page}
        showControls
        total={totalPages || 1}
        onChange={onPageChange}
      />
    </div>
  )
}
