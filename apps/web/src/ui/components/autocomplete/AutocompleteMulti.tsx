'use client'

import { useState, useMemo, useCallback, Key, ReactNode } from 'react'
import {
  Autocomplete as HeroUIAutocomplete,
  AutocompleteItem as HeroUIAutocompleteItem,
} from '@heroui/autocomplete'
import { Chip } from '@heroui/chip'
import { Tooltip } from '@heroui/tooltip'
import { cn } from '@heroui/theme'
import { Check, Info } from 'lucide-react'

interface IAutocompleteMultiItem {
  key: string
  label: string
  description?: string
  startContent?: ReactNode
  endContent?: ReactNode
}

interface IAutocompleteMultiProps {
  items: IAutocompleteMultiItem[]
  selectedKeys: string[]
  onSelectionChange: (keys: string[]) => void
  onInputChange?: (value: string) => void
  label?: ReactNode
  placeholder?: string
  tooltip?: string
  description?: string
  errorMessage?: string
  isRequired?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  className?: string
  emptyContent?: ReactNode
  'aria-label'?: string
}

export function AutocompleteMulti({
  items,
  selectedKeys,
  onSelectionChange,
  onInputChange,
  label,
  placeholder,
  tooltip,
  description,
  errorMessage,
  isRequired = false,
  isDisabled = false,
  isLoading = false,
  className,
  emptyContent,
  'aria-label': ariaLabel,
}: IAutocompleteMultiProps) {
  const [inputValue, setInputValue] = useState('')

  // Build a map for quick label lookups
  const itemsMap = useMemo(() => {
    const map = new Map<string, IAutocompleteMultiItem>()
    items.forEach((item) => map.set(item.key, item))
    return map
  }, [items])

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const handleSelectionChange = useCallback(
    (key: Key | null) => {
      if (key == null) return
      const selectedKey = String(key)
      if (selectedSet.has(selectedKey)) {
        onSelectionChange(selectedKeys.filter((k) => k !== selectedKey))
      } else {
        onSelectionChange([...selectedKeys, selectedKey])
      }
      setInputValue('')
      onInputChange?.('')
    },
    [selectedKeys, selectedSet, onSelectionChange, onInputChange]
  )

  const handleRemove = useCallback(
    (keyToRemove: string) => {
      onSelectionChange(selectedKeys.filter((k) => k !== keyToRemove))
    },
    [selectedKeys, onSelectionChange]
  )

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value)
      onInputChange?.(value)
    },
    [onInputChange]
  )

  // Build label with required indicator and tooltip
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
    <div className={cn('flex flex-col gap-1.5', className)}>
      <HeroUIAutocomplete
        aria-label={ariaLabel}
        color="default"
        description={tooltip ? undefined : description}
        errorMessage={errorMessage}
        inputValue={inputValue}
        isClearable={false}
        isDisabled={isDisabled}
        isInvalid={!!errorMessage}
        isLoading={isLoading}
        isRequired={false}
        label={labelContent}
        labelPlacement="outside"
        listboxProps={{
          emptyContent: emptyContent || 'No hay resultados',
        }}
        placeholder={placeholder}
        radius="sm"
        selectedKey={null}
        size="md"
        variant="bordered"
        onInputChange={handleInputChange}
        onSelectionChange={handleSelectionChange}
      >
        {items.map((item) => (
          <HeroUIAutocompleteItem
            key={item.key}
            description={item.description}
            endContent={selectedSet.has(item.key) ? <Check className="h-4 w-4 text-success" /> : item.endContent}
            startContent={item.startContent}
            textValue={item.label}
          >
            {item.label}
          </HeroUIAutocompleteItem>
        ))}
      </HeroUIAutocomplete>

      {selectedKeys.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedKeys.map((key) => {
            const item = itemsMap.get(key)
            return (
              <Chip
                key={key}
                color="primary"
                size="sm"
                variant="flat"
                onClose={isDisabled ? undefined : () => handleRemove(key)}
              >
                {item?.label || key}
              </Chip>
            )
          })}
        </div>
      )}
    </div>
  )
}

export type { IAutocompleteMultiProps, IAutocompleteMultiItem }
