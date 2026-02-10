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
}: ITableProps<T>) {
  const renderCellContent = useCallback(
    (row: T, columnKey: TableKey) => {
      return renderCell(row, columnKey as keyof T | string)
    },
    [renderCell]
  )

  return (
    <HeroUITable
      aria-label={ariaLabel}
      className={cn(className)}
      classNames={{
        ...classNames,
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
      onSelectionChange={(keys) => onSelectionChange?.(keys as Selection)}
    >
      <HeroUITableHeader columns={columns}>
        {(column) => (
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
        {(row) => (
          <HeroUITableRow
            key={String(row.id)}
            className={onRowClick ? 'cursor-pointer' : undefined}
            onClick={() => onRowClick?.(row)}
          >
            {(columnKey) => (
              <HeroUITableCell>{renderCellContent(row, columnKey)}</HeroUITableCell>
            )}
          </HeroUITableRow>
        )}
      </HeroUITableBody>
    </HeroUITable>
  )
}

export type { TTableColor, TTableLayout, TSelectionMode, ITableProps, ITableColumn }
