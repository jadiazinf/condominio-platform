import {
  getYear,
  getMonth,
  getDate,
  getDay,
  getHours,
  getMinutes,
  getSeconds,
  getMilliseconds,
  getTime,
  getWeek,
  getQuarter,
  getDaysInMonth,
  getDaysInYear,
  getWeeksInMonth,
  getISOWeek,
  getISOWeekYear,
} from 'date-fns'
import { es } from 'date-fns/locale'

export type TDateInput = Date | string | number

function toDate(input: TDateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

// ============================================
// Date component extractors
// ============================================

/**
 * Gets the year of a date
 */
export function getDateYear(date: TDateInput): number {
  return getYear(toDate(date))
}

/**
 * Gets the month of a date (1-12)
 */
export function getDateMonth(date: TDateInput): number {
  return getMonth(toDate(date)) + 1
}

/**
 * Gets the day of the month (1-31)
 */
export function getDateDay(date: TDateInput): number {
  return getDate(toDate(date))
}

/**
 * Gets the day of the week (0-6, where 0 is Sunday)
 */
export function getDayOfWeek(date: TDateInput): number {
  return getDay(toDate(date))
}

/**
 * Gets the hours of a date (0-23)
 */
export function getDateHours(date: TDateInput): number {
  return getHours(toDate(date))
}

/**
 * Gets the minutes of a date (0-59)
 */
export function getDateMinutes(date: TDateInput): number {
  return getMinutes(toDate(date))
}

/**
 * Gets the seconds of a date (0-59)
 */
export function getDateSeconds(date: TDateInput): number {
  return getSeconds(toDate(date))
}

/**
 * Gets the milliseconds of a date (0-999)
 */
export function getDateMilliseconds(date: TDateInput): number {
  return getMilliseconds(toDate(date))
}

/**
 * Gets the timestamp (milliseconds since epoch)
 */
export function getTimestamp(date: TDateInput): number {
  return getTime(toDate(date))
}

/**
 * Gets the Unix timestamp (seconds since epoch)
 */
export function getUnixTimestamp(date: TDateInput): number {
  return Math.floor(getTime(toDate(date)) / 1000)
}

/**
 * Gets the week number of the year (locale-aware, starts on Monday for Spanish)
 */
export function getWeekNumber(date: TDateInput): number {
  return getWeek(toDate(date), { locale: es })
}

/**
 * Gets the ISO week number of the year
 */
export function getISOWeekNumber(date: TDateInput): number {
  return getISOWeek(toDate(date))
}

/**
 * Gets the ISO week-numbering year
 */
export function getISOWeekYearNumber(date: TDateInput): number {
  return getISOWeekYear(toDate(date))
}

/**
 * Gets the quarter of the year (1-4)
 */
export function getDateQuarter(date: TDateInput): number {
  return getQuarter(toDate(date))
}

/**
 * Gets the number of days in the month of a date
 */
export function getDaysInDateMonth(date: TDateInput): number {
  return getDaysInMonth(toDate(date))
}

/**
 * Gets the number of days in the year of a date
 */
export function getDaysInDateYear(date: TDateInput): number {
  return getDaysInYear(toDate(date))
}

/**
 * Gets the number of weeks in the month of a date
 */
export function getWeeksInDateMonth(date: TDateInput): number {
  return getWeeksInMonth(toDate(date), { locale: es })
}

// ============================================
// Combined extractors
// ============================================

/**
 * Gets all date components as an object
 */
export function getDateComponents(date: TDateInput): {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
  dayOfWeek: number
  timestamp: number
} {
  const d = toDate(date)
  return {
    year: getYear(d),
    month: getMonth(d) + 1,
    day: getDate(d),
    hours: getHours(d),
    minutes: getMinutes(d),
    seconds: getSeconds(d),
    milliseconds: getMilliseconds(d),
    dayOfWeek: getDay(d),
    timestamp: getTime(d),
  }
}

/**
 * Gets date only components (year, month, day)
 */
export function getDateOnlyComponents(date: TDateInput): {
  year: number
  month: number
  day: number
} {
  const d = toDate(date)
  return {
    year: getYear(d),
    month: getMonth(d) + 1,
    day: getDate(d),
  }
}

/**
 * Gets time only components (hours, minutes, seconds, milliseconds)
 */
export function getTimeOnlyComponents(date: TDateInput): {
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
} {
  const d = toDate(date)
  return {
    hours: getHours(d),
    minutes: getMinutes(d),
    seconds: getSeconds(d),
    milliseconds: getMilliseconds(d),
  }
}
