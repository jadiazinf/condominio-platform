'use client'

import { Pagination as HeroUIPagination } from '@heroui/pagination'
import { Select, SelectItem } from '@heroui/select'
import { cn } from '@heroui/theme'

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

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-4">
        {showLimitSelector && onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Mostrar</span>
            <Select
              aria-label="Items per page"
              className="w-20"
              selectedKeys={[String(limit)]}
              size="sm"
              variant="bordered"
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0]
                if (value) onLimitChange(Number(value))
              }}
            >
              {limitOptions.map((option) => (
                <SelectItem key={String(option)}>{String(option)}</SelectItem>
              ))}
            </Select>
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
        size="sm"
        total={totalPages || 1}
        onChange={onPageChange}
      />
    </div>
  )
}
