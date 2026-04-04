'use client'

import { DatePicker as HeroUIDatePicker } from '@heroui/date-picker'
import { Tooltip } from '@heroui/tooltip'
import { parseDate, type CalendarDate } from '@internationalized/date'
import { I18nProvider } from '@react-aria/i18n'
import { ReactNode, useMemo } from 'react'
import { Info } from 'lucide-react'

import { useModalPortalContainer } from '../modal/Modal'

type TDatePickerRadius = 'none' | 'sm' | 'md' | 'lg' | 'full'
type TDatePickerSize = 'sm' | 'md' | 'lg'
type TDatePickerColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
type TDatePickerVariant = 'flat' | 'bordered' | 'underlined' | 'faded'
type TLabelPlacement = 'inside' | 'outside' | 'outside-left'

interface IDatePickerProps {
  /** Label displayed above the input */
  label?: ReactNode
  labelPlacement?: TLabelPlacement
  /** Description text below the input */
  description?: string
  /** Tooltip text shown on hover of info icon next to label */
  tooltip?: string
  /** Error message to display */
  errorMessage?: string
  /** String date value in YYYY-MM-DD format */
  value?: string
  /** Called with string value in YYYY-MM-DD format, or empty string when cleared */
  onChange?: (value: string) => void
  placeholder?: string
  size?: TDatePickerSize
  color?: TDatePickerColor
  variant?: TDatePickerVariant
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  /** Minimum selectable date in YYYY-MM-DD format */
  minValue?: string
  /** Maximum selectable date in YYYY-MM-DD format */
  maxValue?: string
  className?: string
  /** Locale for formatting, defaults to 'es-VE' */
  locale?: string
  radius?: TDatePickerRadius
}

/**
 * DatePicker component wrapping HeroUI DatePicker.
 *
 * Works with string dates in YYYY-MM-DD format for compatibility
 * with existing form schemas and API payloads.
 */
function DatePicker({
  label,
  labelPlacement = 'outside',
  description,
  tooltip,
  errorMessage,
  value,
  onChange,
  size = 'md',
  color = 'default',
  variant = 'bordered',
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  isReadOnly = false,
  minValue,
  maxValue,
  className,
  locale = 'es-VE',
  radius = 'sm',
}: IDatePickerProps) {
  const modalPortalRef = useModalPortalContainer()
  // Parse string to CalendarDate
  const calendarValue = useMemo(() => {
    if (!value) return null
    try {
      return parseDate(value)
    } catch {
      return null
    }
  }, [value])

  const calendarMinValue = useMemo(() => {
    if (!minValue) return undefined
    try {
      return parseDate(minValue)
    } catch {
      return undefined
    }
  }, [minValue])

  const calendarMaxValue = useMemo(() => {
    if (!maxValue) return undefined
    try {
      return parseDate(maxValue)
    } catch {
      return undefined
    }
  }, [maxValue])

  function handleChange(date: CalendarDate | null) {
    if (!onChange) return

    if (!date) {
      onChange('')

      return
    }

    // Format as YYYY-MM-DD
    const year = String(date.year).padStart(4, '0')
    const month = String(date.month).padStart(2, '0')
    const day = String(date.day).padStart(2, '0')

    onChange(`${year}-${month}-${day}`)
  }

  // Build label with tooltip and required asterisk
  // If label is already a ReactNode (JSX), use it as-is
  const labelContent = label ? (
    typeof label === 'string' ? (
      <span className="flex items-center gap-1.5">
        {isRequired && <span className="text-danger">*</span>}
        {label}
        {tooltip && (
          <Tooltip
            showArrow
            classNames={{
              content: 'max-w-xs text-sm',
            }}
            content={tooltip}
            placement="right"
          >
            <button type="button" tabIndex={-1} className="inline-flex" onMouseDown={e => e.preventDefault()}>
              <Info className="h-3.5 w-3.5 text-default-400 cursor-help" />
            </button>
          </Tooltip>
        )}
      </span>
    ) : (
      label
    )
  ) : undefined

  return (
    <I18nProvider locale={locale}>
      <HeroUIDatePicker
        showMonthAndYearPickers
        calendarProps={{
          classNames: {
            base: 'z-50',
          },
        }}
        className={className}
        color={color}
        description={tooltip ? undefined : description}
        errorMessage={errorMessage}
        granularity="day"
        isDisabled={isDisabled}
        isInvalid={isInvalid || !!errorMessage}
        isReadOnly={isReadOnly}
        isRequired={false}
        label={labelContent}
        labelPlacement={labelPlacement}
        maxValue={calendarMaxValue}
        minValue={calendarMinValue}
        popoverProps={
          modalPortalRef?.current
            ? {
                portalContainer: modalPortalRef.current,
              }
            : undefined
        }
        radius={radius}
        size={size}
        value={calendarValue}
        variant={variant}
        onChange={handleChange}
      />
    </I18nProvider>
  )
}

export { DatePicker }
export type { IDatePickerProps, TDatePickerSize, TDatePickerColor, TDatePickerVariant }
