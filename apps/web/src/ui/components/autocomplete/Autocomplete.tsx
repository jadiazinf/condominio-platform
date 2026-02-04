'use client'

import { Autocomplete as HeroUIAutocomplete, AutocompleteItem as HeroUIAutocompleteItem } from '@heroui/autocomplete'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { ReactNode, Key } from 'react'
import { Info } from 'lucide-react'

type TAutocompleteSize = 'sm' | 'md' | 'lg'

type TAutocompleteColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

type TAutocompleteVariant = 'flat' | 'bordered' | 'underlined' | 'faded'

type TAutocompleteRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'

type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

interface IAutocompleteItem {
  key: string
  label: string
  description?: string
  startContent?: ReactNode
  endContent?: ReactNode
}

interface IAutocompleteProps {
  items: IAutocompleteItem[]
  size?: TAutocompleteSize
  color?: TAutocompleteColor
  variant?: TAutocompleteVariant
  radius?: TAutocompleteRadius
  label?: ReactNode
  labelPlacement?: TLabelPlacement
  placeholder?: string
  description?: string
  tooltip?: string
  errorMessage?: string
  value?: string | null
  defaultValue?: string
  inputValue?: string
  defaultInputValue?: string
  onInputChange?: (value: string) => void
  onSelectionChange?: (key: Key | null) => void
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  isClearable?: boolean
  allowsCustomValue?: boolean
  className?: string
  classNames?: {
    base?: string
    label?: string
    listboxWrapper?: string
    listbox?: string
    popoverContent?: string
    endContentWrapper?: string
    clearButton?: string
    selectorButton?: string
  }
  'aria-label'?: string
  emptyContent?: ReactNode
}

export function Autocomplete({
  items,
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
  inputValue,
  defaultInputValue,
  onInputChange,
  onSelectionChange,
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isLoading = false,
  isClearable = true,
  allowsCustomValue = false,
  className,
  classNames,
  'aria-label': ariaLabel,
  emptyContent,
}: IAutocompleteProps) {
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

  return (
    <HeroUIAutocomplete
      allowsCustomValue={allowsCustomValue}
      aria-label={ariaLabel}
      className={cn(className)}
      classNames={classNames}
      color={color}
      defaultInputValue={defaultInputValue}
      defaultSelectedKey={defaultValue}
      description={tooltip ? undefined : description}
      errorMessage={errorMessage}
      inputValue={inputValue}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isInvalid={isInvalid || !!errorMessage}
      isLoading={isLoading}
      isRequired={false}
      label={labelContent}
      labelPlacement={labelPlacement}
      listboxProps={{
        emptyContent: emptyContent || 'No hay resultados',
      }}
      placeholder={placeholder}
      radius={radius}
      selectedKey={value}
      size={size}
      variant={variant}
      onInputChange={onInputChange}
      onSelectionChange={onSelectionChange}
    >
      {items.map((item) => (
        <HeroUIAutocompleteItem
          key={item.key}
          description={item.description}
          endContent={item.endContent}
          startContent={item.startContent}
          textValue={item.label}
        >
          {item.label}
        </HeroUIAutocompleteItem>
      ))}
    </HeroUIAutocomplete>
  )
}

export type {
  TAutocompleteSize,
  TAutocompleteColor,
  TAutocompleteVariant,
  TAutocompleteRadius,
  TLabelPlacement,
  IAutocompleteProps,
  IAutocompleteItem,
}
