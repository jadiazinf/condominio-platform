import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  addHours,
  addMinutes,
  addSeconds,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  subHours,
  subMinutes,
  subSeconds,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfHour,
  endOfHour,
  set,
  setYear,
  setMonth,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns'
import { es } from 'date-fns/locale'

export type TDateInput = Date | string | number

function toDate(input: TDateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

// ============================================
// Current date/time creators
// ============================================

/**
 * Returns the current date and time
 */
export function now(): Date {
  return new Date()
}

/**
 * Returns today's date at midnight (00:00:00)
 */
export function today(): Date {
  return startOfDay(new Date())
}

/**
 * Returns tomorrow's date at midnight
 */
export function tomorrow(): Date {
  return startOfDay(addDays(new Date(), 1))
}

/**
 * Returns yesterday's date at midnight
 */
export function yesterday(): Date {
  return startOfDay(subDays(new Date(), 1))
}

// ============================================
// Date creation from components
// ============================================

/**
 * Creates a date from year, month (1-12), and day
 */
export function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

/**
 * Creates a datetime from components
 */
export function createDateTime(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0
): Date {
  return new Date(year, month - 1, day, hours, minutes, seconds)
}

/**
 * Creates a date from an ISO date string (e.g., "2025-12-27")
 */
export function fromISODate(isoDate: string): Date {
  const parts = isoDate.split('-').map(Number)
  const year = parts[0] ?? 1970
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return createDate(year, month, day)
}

/**
 * Creates a date from a timestamp (milliseconds since epoch)
 */
export function fromTimestamp(timestamp: number): Date {
  return new Date(timestamp)
}

/**
 * Creates a date from a Unix timestamp (seconds since epoch)
 */
export function fromUnixTimestamp(unixTimestamp: number): Date {
  return new Date(unixTimestamp * 1000)
}

// ============================================
// Date addition
// ============================================

/**
 * Adds days to a date
 */
export function addDaysToDate(date: TDateInput, days: number): Date {
  return addDays(toDate(date), days)
}

/**
 * Adds weeks to a date
 */
export function addWeeksToDate(date: TDateInput, weeks: number): Date {
  return addWeeks(toDate(date), weeks)
}

/**
 * Adds months to a date
 */
export function addMonthsToDate(date: TDateInput, months: number): Date {
  return addMonths(toDate(date), months)
}

/**
 * Adds years to a date
 */
export function addYearsToDate(date: TDateInput, years: number): Date {
  return addYears(toDate(date), years)
}

/**
 * Adds hours to a date
 */
export function addHoursToDate(date: TDateInput, hours: number): Date {
  return addHours(toDate(date), hours)
}

/**
 * Adds minutes to a date
 */
export function addMinutesToDate(date: TDateInput, minutes: number): Date {
  return addMinutes(toDate(date), minutes)
}

/**
 * Adds seconds to a date
 */
export function addSecondsToDate(date: TDateInput, seconds: number): Date {
  return addSeconds(toDate(date), seconds)
}

// ============================================
// Date subtraction
// ============================================

/**
 * Subtracts days from a date
 */
export function subtractDays(date: TDateInput, days: number): Date {
  return subDays(toDate(date), days)
}

/**
 * Subtracts weeks from a date
 */
export function subtractWeeks(date: TDateInput, weeks: number): Date {
  return subWeeks(toDate(date), weeks)
}

/**
 * Subtracts months from a date
 */
export function subtractMonths(date: TDateInput, months: number): Date {
  return subMonths(toDate(date), months)
}

/**
 * Subtracts years from a date
 */
export function subtractYears(date: TDateInput, years: number): Date {
  return subYears(toDate(date), years)
}

/**
 * Subtracts hours from a date
 */
export function subtractHours(date: TDateInput, hours: number): Date {
  return subHours(toDate(date), hours)
}

/**
 * Subtracts minutes from a date
 */
export function subtractMinutes(date: TDateInput, minutes: number): Date {
  return subMinutes(toDate(date), minutes)
}

/**
 * Subtracts seconds from a date
 */
export function subtractSeconds(date: TDateInput, seconds: number): Date {
  return subSeconds(toDate(date), seconds)
}

// ============================================
// Start/End of periods
// ============================================

/**
 * Returns the start of the day (00:00:00)
 */
export function getStartOfDay(date: TDateInput): Date {
  return startOfDay(toDate(date))
}

/**
 * Returns the end of the day (23:59:59.999)
 */
export function getEndOfDay(date: TDateInput): Date {
  return endOfDay(toDate(date))
}

/**
 * Returns the start of the week (Monday by default for Spanish locale)
 */
export function getStartOfWeek(date: TDateInput): Date {
  return startOfWeek(toDate(date), { locale: es })
}

/**
 * Returns the end of the week (Sunday by default for Spanish locale)
 */
export function getEndOfWeek(date: TDateInput): Date {
  return endOfWeek(toDate(date), { locale: es })
}

/**
 * Returns the start of the month
 */
export function getStartOfMonth(date: TDateInput): Date {
  return startOfMonth(toDate(date))
}

/**
 * Returns the end of the month
 */
export function getEndOfMonth(date: TDateInput): Date {
  return endOfMonth(toDate(date))
}

/**
 * Returns the start of the year
 */
export function getStartOfYear(date: TDateInput): Date {
  return startOfYear(toDate(date))
}

/**
 * Returns the end of the year
 */
export function getEndOfYear(date: TDateInput): Date {
  return endOfYear(toDate(date))
}

/**
 * Returns the start of the hour
 */
export function getStartOfHour(date: TDateInput): Date {
  return startOfHour(toDate(date))
}

/**
 * Returns the end of the hour
 */
export function getEndOfHour(date: TDateInput): Date {
  return endOfHour(toDate(date))
}

// ============================================
// Date setters
// ============================================

/**
 * Sets multiple date components at once
 */
export function setDateComponents(
  date: TDateInput,
  components: {
    year?: number
    month?: number
    date?: number
    hours?: number
    minutes?: number
    seconds?: number
    milliseconds?: number
  }
): Date {
  return set(toDate(date), components)
}

/**
 * Sets the year of a date
 */
export function setDateYear(date: TDateInput, year: number): Date {
  return setYear(toDate(date), year)
}

/**
 * Sets the month of a date (1-12)
 */
export function setDateMonth(date: TDateInput, month: number): Date {
  return setMonth(toDate(date), month - 1)
}

/**
 * Sets the day of the month
 */
export function setDateDay(date: TDateInput, day: number): Date {
  return setDate(toDate(date), day)
}

/**
 * Sets the hours of a date
 */
export function setDateHours(date: TDateInput, hours: number): Date {
  return setHours(toDate(date), hours)
}

/**
 * Sets the minutes of a date
 */
export function setDateMinutes(date: TDateInput, minutes: number): Date {
  return setMinutes(toDate(date), minutes)
}

/**
 * Sets the seconds of a date
 */
export function setDateSeconds(date: TDateInput, seconds: number): Date {
  return setSeconds(toDate(date), seconds)
}

// ============================================
// Utility creators
// ============================================

/**
 * Creates a date range (start and end dates)
 */
export function createDateRange(
  startDate: TDateInput,
  endDate: TDateInput
): { start: Date; end: Date } {
  return {
    start: toDate(startDate),
    end: toDate(endDate),
  }
}

/**
 * Creates a date N days from now
 */
export function daysFromNow(days: number): Date {
  return addDays(new Date(), days)
}

/**
 * Creates a date N months from now
 */
export function monthsFromNow(months: number): Date {
  return addMonths(new Date(), months)
}

/**
 * Creates a date N years from now
 */
export function yearsFromNow(years: number): Date {
  return addYears(new Date(), years)
}

/**
 * Creates a date N days ago
 */
export function daysAgo(days: number): Date {
  return subDays(new Date(), days)
}

/**
 * Creates a date N months ago
 */
export function monthsAgo(months: number): Date {
  return subMonths(new Date(), months)
}

/**
 * Creates a date N years ago
 */
export function yearsAgo(years: number): Date {
  return subYears(new Date(), years)
}

/**
 * Returns the first day of the current month
 */
export function firstDayOfCurrentMonth(): Date {
  return startOfMonth(new Date())
}

/**
 * Returns the last day of the current month
 */
export function lastDayOfCurrentMonth(): Date {
  return endOfMonth(new Date())
}

/**
 * Returns the first day of the current year
 */
export function firstDayOfCurrentYear(): Date {
  return startOfYear(new Date())
}

/**
 * Returns the last day of the current year
 */
export function lastDayOfCurrentYear(): Date {
  return endOfYear(new Date())
}
