'use client'

import { Select as HeroUISelect, SelectItem as HeroUISelectItem } from '@heroui/select'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode } from 'react'
import { Info } from 'lucide-react'

type TSelectSize = 'sm' | 'md' | 'lg'

type TSelectColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TSelectVariant = 'flat' | 'bordered' | 'underlined' | 'faded'

type TSelectRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

interface ISelectItem {
  key: string
  label: string
  description?: string
  startContent?: ReactNode
  endContent?: ReactNode
}

interface ISelectProps {
  items?: ISelectItem[]
  children?: ReactNode
  size?: TSelectSize
  color?: TSelectColor
  variant?: TSelectVariant
  radius?: TSelectRadius
  label?: ReactNode
  labelPlacement?: TLabelPlacement
  placeholder?: string
  description?: string
  tooltip?: string
  errorMessage?: string
  value?: string | null
  defaultValue?: string
  selectedKeys?: string[]
  onSelectionChange?: (keys: any) => void
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  className?: string
  classNames?: {
    base?: string
    label?: string
    trigger?: string
    mainWrapper?: string
    innerWrapper?: string
    selectorIcon?: string
    value?: string
    listboxWrapper?: string
    listbox?: string
    popoverContent?: string
    helperWrapper?: string
    description?: string
    errorMessage?: string
  }
  'aria-label'?: string
  onChange?: (key: string | null) => void
}

export function Select({
  items,
  children,
  size = 'md',
  color = 'default',
  variant = 'bordered',
  radius = 'sm',
  label,
  labelPlacement = 'outside',
  placeholder,
  description,
  tooltip,
  errorMessage,
  value,
  defaultValue,
  selectedKeys,
  onSelectionChange,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isLoading = false,
  className,
  classNames,
  'aria-label': ariaLabel,
  onChange,
}: ISelectProps) {
  // If label is already a ReactNode (JSX), use it directly; otherwise wrap it with tooltip support
  const labelContent = label ? (
    typeof label === 'string' ? (
      <span className="flex items-center gap-1.5">
        {isRequired && <span className="text-danger">*</span>}
        {label}
        {tooltip && (
          <Tooltip
            content={tooltip}
            placement="right"
            showArrow
            classNames={{
              content: 'max-w-xs text-sm',
            }}
          >
            <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
          </Tooltip>
        )}
      </span>
    ) : (
      label
    )
  ) : undefined

  const handleSelectionChange = (keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return
    const selectedKey = Array.from(keys)[0] as string | undefined
    onChange?.(selectedKey || null)
  }

  // Merge default placeholder styling with user classNames
  const mergedClassNames = {
    ...classNames,
    value: cn('group-data-[has-value=false]:text-default-400 group-data-[has-value=false]:opacity-70', classNames?.value),
  }

  // If children are provided, use them directly (HeroUI Select pattern)
  if (children) {
    return (
      <HeroUISelect
        aria-label={ariaLabel}
        className={cn(className)}
        classNames={mergedClassNames}
        color={color}
        defaultSelectedKeys={defaultValue ? [defaultValue] : undefined}
        description={tooltip ? undefined : description}
        errorMessage={errorMessage}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        isLoading={isLoading}
        isRequired={false}
        label={labelContent}
        labelPlacement={labelPlacement}
        placeholder={placeholder || (labelPlacement !== 'inside' ? ' ' : undefined)}
        radius={radius}
        selectedKeys={selectedKeys}
        size={size}
        variant={variant}
        onSelectionChange={onSelectionChange}
      >
        {children as any}
      </HeroUISelect>
    )
  }

  // Otherwise use the items prop pattern
  // Support both value/onChange and selectedKeys/onSelectionChange patterns
  const resolvedSelectedKeys = value !== undefined ? (value ? [value] : []) : (selectedKeys ?? [])
  const resolvedOnSelectionChange = onChange ? handleSelectionChange : onSelectionChange

  return (
    <HeroUISelect
      aria-label={ariaLabel}
      className={cn(className)}
      classNames={mergedClassNames}
      color={color}
      defaultSelectedKeys={defaultValue ? [defaultValue] : undefined}
      description={tooltip ? undefined : description}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isLoading={isLoading}
      isRequired={false}
      label={labelContent}
      labelPlacement={labelPlacement}
      placeholder={placeholder || (labelPlacement !== 'inside' ? ' ' : undefined)}
      radius={radius}
      selectedKeys={resolvedSelectedKeys}
      size={size}
      variant={variant}
      onSelectionChange={resolvedOnSelectionChange}
    >
      {items?.map((item) => (
        <HeroUISelectItem
          key={item.key}
          description={item.description}
          endContent={item.endContent}
          startContent={item.startContent}
          textValue={item.label}
        >
          {item.label}
        </HeroUISelectItem>
      )) as any}
    </HeroUISelect>
  )
}

export type { TSelectSize, TSelectColor, TSelectVariant, TSelectRadius, TLabelPlacement, ISelectProps, ISelectItem }
