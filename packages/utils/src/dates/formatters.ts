import {
  format,
  formatDistance,
  formatDistanceToNow,
  formatRelative,
  formatISO,
  formatRFC3339,
} from 'date-fns'
import { es, enUS } from 'date-fns/locale'

export type TDateInput = Date | string | number
export type TLocale = 'es' | 'en'

const locales = {
  es,
  en: enUS,
}

function toDate(input: TDateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

/**
 * Formats a date to a full date string (e.g., "27 de diciembre de 2025")
 */
export function formatFullDate(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'PPP', { locale: locales[locale] })
}

/**
 * Formats a date to a short date string (e.g., "27/12/2025")
 */
export function formatShortDate(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'P', { locale: locales[locale] })
}

/**
 * Formats a date to a numeric date string (e.g., "27-12-2025")
 */
export function formatNumericDate(date: TDateInput): string {
  return format(toDate(date), 'dd-MM-yyyy')
}

/**
 * Formats a date to ISO date string (e.g., "2025-12-27")
 */
export function formatISODate(date: TDateInput): string {
  return format(toDate(date), 'yyyy-MM-dd')
}

/**
 * Formats a timestamp to time string (e.g., "14:30")
 */
export function formatTime(date: TDateInput): string {
  return format(toDate(date), 'HH:mm')
}

/**
 * Formats a timestamp to time with seconds (e.g., "14:30:45")
 */
export function formatTimeWithSeconds(date: TDateInput): string {
  return format(toDate(date), 'HH:mm:ss')
}

/**
 * Formats a timestamp to 12-hour time (e.g., "2:30 PM")
 */
export function formatTime12h(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'p', { locale: locales[locale] })
}

/**
 * Formats a timestamp to full datetime (e.g., "27 de diciembre de 2025, 14:30")
 */
export function formatDateTime(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'PPp', { locale: locales[locale] })
}

/**
 * Formats a timestamp to short datetime (e.g., "27/12/2025 14:30")
 */
export function formatShortDateTime(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'Pp', { locale: locales[locale] })
}

/**
 * Formats a timestamp to full datetime with seconds (e.g., "27/12/2025 14:30:45")
 */
export function formatFullDateTime(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'PPpp', { locale: locales[locale] })
}

/**
 * Formats a date relative to now (e.g., "hace 3 días")
 */
export function formatRelativeToNow(date: TDateInput, locale: TLocale = 'es'): string {
  return formatDistanceToNow(toDate(date), {
    addSuffix: true,
    locale: locales[locale],
  })
}

/**
 * Formats the distance between two dates (e.g., "3 días")
 */
export function formatDateDistance(
  date: TDateInput,
  baseDate: TDateInput,
  locale: TLocale = 'es'
): string {
  return formatDistance(toDate(date), toDate(baseDate), {
    locale: locales[locale],
  })
}

/**
 * Formats a date relative to a base date with context (e.g., "el viernes pasado a las 14:30")
 */
export function formatRelativeDate(
  date: TDateInput,
  baseDate: TDateInput,
  locale: TLocale = 'es'
): string {
  return formatRelative(toDate(date), toDate(baseDate), {
    locale: locales[locale],
  })
}

/**
 * Formats a date to ISO 8601 format (e.g., "2025-12-27T14:30:00.000Z")
 */
export function formatToISO(date: TDateInput): string {
  return formatISO(toDate(date))
}

/**
 * Formats a date to RFC 3339 format (e.g., "2025-12-27T14:30:00Z")
 */
export function formatToRFC3339(date: TDateInput): string {
  return formatRFC3339(toDate(date))
}

/**
 * Formats a date with a custom pattern
 * @see https://date-fns.org/docs/format for pattern reference
 */
export function formatCustom(date: TDateInput, pattern: string, locale: TLocale = 'es'): string {
  return format(toDate(date), pattern, { locale: locales[locale] })
}

/**
 * Formats a date for display in a month/year picker (e.g., "Diciembre 2025")
 */
export function formatMonthYear(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'LLLL yyyy', { locale: locales[locale] })
}

/**
 * Formats a date to show only the day name (e.g., "viernes")
 */
export function formatDayName(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'EEEE', { locale: locales[locale] })
}

/**
 * Formats a date to show only the month name (e.g., "diciembre")
 */
export function formatMonthName(date: TDateInput, locale: TLocale = 'es'): string {
  return format(toDate(date), 'LLLL', { locale: locales[locale] })
}

/**
 * Formats a date for database storage (timestamp format)
 */
export function formatForDatabase(date: TDateInput): string {
  return format(toDate(date), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
}
