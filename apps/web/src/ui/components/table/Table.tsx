'use client'

import {
  Table as HeroUITable,
  TableHeader as HeroUITableHeader,
  TableBody as HeroUITableBody,
  TableColumn as HeroUITableColumn,
  TableRow as HeroUITableRow,
  TableCell as HeroUITableCell,
} from '@heroui/table'
import { cn } from '@heroui/theme'
import { ReactNode, useCallback } from 'react'

// HeroUI compatible key type (excludes bigint to match @react-types/shared)
type TableKey = string | number

// Selection type compatible with HeroUI
type Selection = 'all' | Set<TableKey>

type TTableColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TTableLayout = 'auto' | 'fixed'

type TSelectionMode = 'none' | 'single' | 'multiple'

interface ITableColumn<T> {
  key: keyof T | string
  label: string
  align?: 'start' | 'center' | 'end'
  allowsSorting?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  className?: string
  /** Hide this column in the mobile card view */
  hideOnMobile?: boolean
  /** Render this column full-width in the mobile card view (no label, content spans entire row) */
  mobileFullWidth?: boolean
}

interface ITableProps<T extends { id: string | number }> {
  columns: ITableColumn<T>[]
  rows: T[]
  renderCell: (row: T, columnKey: keyof T | string) => ReactNode
  'aria-label': string
  color?: TTableColor
  layout?: TTableLayout
  radius?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  hideHeader?: boolean
  isHeaderSticky?: boolean
  isStriped?: boolean
  isCompact?: boolean
  removeWrapper?: boolean
  fullWidth?: boolean
  selectionMode?: TSelectionMode
  selectedKeys?: Selection
  disabledKeys?: Selection
  emptyContent?: ReactNode
  isLoading?: boolean
  loadingContent?: ReactNode
  className?: string
  classNames?: {
    base?: string
    wrapper?: string
    table?: string
    thead?: string
    tbody?: string
    tr?: string
    th?: string
    td?: string
    tfoot?: string
    sortIcon?: string
    emptyWrapper?: string
    loadingWrapper?: string
  }
  onSelectionChange?: (keys: Selection) => void
  onRowClick?: (row: T) => void
  /** Enable automatic mobile card view (default: true). Set to false if the parent already handles mobile layout. */
  mobileCards?: boolean
}

export function Table<T extends { id: string | number }>({
  columns,
  rows,
  renderCell,
  'aria-label': ariaLabel,
  color = 'default',
  layout = 'auto',
  radius = 'lg',
  shadow = 'sm',
  hideHeader = false,
  isHeaderSticky = false,
  isStriped = false,
  isCompact = false,
  removeWrapper = false,
  fullWidth = true,
  selectionMode = 'none',
  selectedKeys,
  disabledKeys,
  emptyContent,
  isLoading = false,
  loadingContent,
  className,
  classNames,
  onSelectionChange,
  onRowClick,
  mobileCards = true,
}: ITableProps<T>) {
  const renderCellContent = useCallback(
    (row: T, columnKey: TableKey) => {
      return renderCell(row, columnKey as keyof T | string)
    },
    [renderCell]
  )

  const mobileColumnsForCards = columns.filter(c => !c.hideOnMobile)

  const mobileCardView = mobileCards ? (
    <div className="block space-y-3 md:hidden">
      {isLoading && loadingContent}
      {!isLoading && rows.length === 0 && emptyContent && (
        <div className="py-8 text-center text-default-400">{emptyContent}</div>
      )}
      {!isLoading &&
        rows.map(row => (
          <div
            key={String(row.id)}
            className={cn(
              'rounded-lg border border-default-200 bg-content1 p-3 space-y-2',
              onRowClick && 'cursor-pointer active:bg-default-100 transition-colors'
            )}
            onClick={() => onRowClick?.(row)}
          >
            {mobileColumnsForCards.map(col => {
              const content = renderCellContent(row, String(col.key) as TableKey)

              if (content === null || content === undefined) return null

              if (col.mobileFullWidth) {
                return (
                  <div key={String(col.key)} className="min-w-0">
                    {content}
                  </div>
                )
              }

              return (
                <div
                  key={String(col.key)}
                  className="flex items-start justify-between gap-2 min-w-0"
                >
                  <span className="text-xs text-default-500 shrink-0">{col.label}</span>
                  <div className="text-sm text-right min-w-0 break-words">{content}</div>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  ) : null

  const desktopTable = (
    <HeroUITable
      aria-label={ariaLabel}
      className={cn(className)}
      classNames={{
        ...classNames,
        base: cn(mobileCards && 'hidden md:block', classNames?.base),
        thead: cn('[&>tr]:first:shadow-none', classNames?.thead),
        th: cn(
          'bg-transparent border-b border-divider text-default-500 font-medium',
          classNames?.th
        ),
      }}
      color={color}
      disabledKeys={disabledKeys}
      fullWidth={fullWidth}
      hideHeader={hideHeader}
      isCompact={isCompact}
      isHeaderSticky={isHeaderSticky}
      isStriped={isStriped}
      layout={layout}
      radius={radius}
      removeWrapper={removeWrapper}
      selectedKeys={selectedKeys}
      selectionMode={selectionMode}
      shadow={shadow}
      onSelectionChange={keys => onSelectionChange?.(keys as Selection)}
    >
      <HeroUITableHeader columns={columns}>
        {column => (
          <HeroUITableColumn
            key={String(column.key)}
            align={column.align}
            allowsSorting={column.allowsSorting}
            className={cn(column.className)}
            maxWidth={column.maxWidth}
            minWidth={column.minWidth}
            width={column.width}
          >
            {column.label}
          </HeroUITableColumn>
        )}
      </HeroUITableHeader>
      <HeroUITableBody
        emptyContent={emptyContent}
        isLoading={isLoading}
        items={rows}
        loadingContent={loadingContent}
      >
        {row => (
          <HeroUITableRow
            key={String(row.id)}
            className={onRowClick ? 'cursor-pointer' : undefined}
            onClick={() => onRowClick?.(row)}
          >
            {columnKey => <HeroUITableCell>{renderCellContent(row, columnKey)}</HeroUITableCell>}
          </HeroUITableRow>
        )}
      </HeroUITableBody>
    </HeroUITable>
  )

  if (!mobileCards) return desktopTable

  return (
    <>
      {mobileCardView}
      {desktopTable}
    </>
  )
}

export type { TTableColor, TTableLayout, TSelectionMode, ITableProps, ITableColumn }
