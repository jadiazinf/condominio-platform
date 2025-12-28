import {
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
  isFuture,
  isPast,
  isWeekend,
  isMonday,
  isTuesday,
  isWednesday,
  isThursday,
  isFriday,
  isSaturday,
  isSunday,
  isFirstDayOfMonth,
  isLastDayOfMonth,
  isLeapYear,
  isValid,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  differenceInMilliseconds,
  compareAsc,
  compareDesc,
  min,
  max,
  clamp,
} from 'date-fns'
import { es } from 'date-fns/locale'

export type TDateInput = Date | string | number

function toDate(input: TDateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

// ============================================
// Date comparison
// ============================================

/**
 * Checks if date1 is after date2
 */
export function isDateAfter(date1: TDateInput, date2: TDateInput): boolean {
  return isAfter(toDate(date1), toDate(date2))
}

/**
 * Checks if date1 is before date2
 */
export function isDateBefore(date1: TDateInput, date2: TDateInput): boolean {
  return isBefore(toDate(date1), toDate(date2))
}

/**
 * Checks if two dates are equal
 */
export function isDateEqual(date1: TDateInput, date2: TDateInput): boolean {
  return isEqual(toDate(date1), toDate(date2))
}

/**
 * Checks if two dates are on the same day
 */
export function isSameDayAs(date1: TDateInput, date2: TDateInput): boolean {
  return isSameDay(toDate(date1), toDate(date2))
}

/**
 * Checks if two dates are in the same week
 */
export function isSameWeekAs(date1: TDateInput, date2: TDateInput): boolean {
  return isSameWeek(toDate(date1), toDate(date2), { locale: es })
}

/**
 * Checks if two dates are in the same month
 */
export function isSameMonthAs(date1: TDateInput, date2: TDateInput): boolean {
  return isSameMonth(toDate(date1), toDate(date2))
}

/**
 * Checks if two dates are in the same year
 */
export function isSameYearAs(date1: TDateInput, date2: TDateInput): boolean {
  return isSameYear(toDate(date1), toDate(date2))
}

// ============================================
// Date checks
// ============================================

/**
 * Checks if a date is today
 */
export function isDateToday(date: TDateInput): boolean {
  return isToday(toDate(date))
}

/**
 * Checks if a date is tomorrow
 */
export function isDateTomorrow(date: TDateInput): boolean {
  return isTomorrow(toDate(date))
}

/**
 * Checks if a date is yesterday
 */
export function isDateYesterday(date: TDateInput): boolean {
  return isYesterday(toDate(date))
}

/**
 * Checks if a date is in the future
 */
export function isDateInFuture(date: TDateInput): boolean {
  return isFuture(toDate(date))
}

/**
 * Checks if a date is in the past
 */
export function isDateInPast(date: TDateInput): boolean {
  return isPast(toDate(date))
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
export function isDateWeekend(date: TDateInput): boolean {
  return isWeekend(toDate(date))
}

/**
 * Checks if a date is a weekday (Monday to Friday)
 */
export function isDateWeekday(date: TDateInput): boolean {
  return !isWeekend(toDate(date))
}

/**
 * Checks if a date is Monday
 */
export function isDateMonday(date: TDateInput): boolean {
  return isMonday(toDate(date))
}

/**
 * Checks if a date is Tuesday
 */
export function isDateTuesday(date: TDateInput): boolean {
  return isTuesday(toDate(date))
}

/**
 * Checks if a date is Wednesday
 */
export function isDateWednesday(date: TDateInput): boolean {
  return isWednesday(toDate(date))
}

/**
 * Checks if a date is Thursday
 */
export function isDateThursday(date: TDateInput): boolean {
  return isThursday(toDate(date))
}

/**
 * Checks if a date is Friday
 */
export function isDateFriday(date: TDateInput): boolean {
  return isFriday(toDate(date))
}

/**
 * Checks if a date is Saturday
 */
export function isDateSaturday(date: TDateInput): boolean {
  return isSaturday(toDate(date))
}

/**
 * Checks if a date is Sunday
 */
export function isDateSunday(date: TDateInput): boolean {
  return isSunday(toDate(date))
}

/**
 * Checks if a date is the first day of its month
 */
export function isDateFirstDayOfMonth(date: TDateInput): boolean {
  return isFirstDayOfMonth(toDate(date))
}

/**
 * Checks if a date is the last day of its month
 */
export function isDateLastDayOfMonth(date: TDateInput): boolean {
  return isLastDayOfMonth(toDate(date))
}

/**
 * Checks if the year of a date is a leap year
 */
export function isDateInLeapYear(date: TDateInput): boolean {
  return isLeapYear(toDate(date))
}

/**
 * Checks if a value is a valid date
 */
export function isValidDate(date: unknown): boolean {
  if (date instanceof Date) return isValid(date)
  if (typeof date === 'string' || typeof date === 'number') {
    return isValid(new Date(date))
  }
  return false
}

// ============================================
// Date differences
// ============================================

/**
 * Returns the difference in days between two dates
 */
export function getDifferenceInDays(date1: TDateInput, date2: TDateInput): number {
  return differenceInDays(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in weeks between two dates
 */
export function getDifferenceInWeeks(date1: TDateInput, date2: TDateInput): number {
  return differenceInWeeks(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in months between two dates
 */
export function getDifferenceInMonths(date1: TDateInput, date2: TDateInput): number {
  return differenceInMonths(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in years between two dates
 */
export function getDifferenceInYears(date1: TDateInput, date2: TDateInput): number {
  return differenceInYears(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in hours between two dates
 */
export function getDifferenceInHours(date1: TDateInput, date2: TDateInput): number {
  return differenceInHours(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in minutes between two dates
 */
export function getDifferenceInMinutes(date1: TDateInput, date2: TDateInput): number {
  return differenceInMinutes(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in seconds between two dates
 */
export function getDifferenceInSeconds(date1: TDateInput, date2: TDateInput): number {
  return differenceInSeconds(toDate(date1), toDate(date2))
}

/**
 * Returns the difference in milliseconds between two dates
 */
export function getDifferenceInMilliseconds(date1: TDateInput, date2: TDateInput): number {
  return differenceInMilliseconds(toDate(date1), toDate(date2))
}

// ============================================
// Date sorting and min/max
// ============================================

/**
 * Sorts dates in ascending order
 */
export function sortDatesAscending(dates: TDateInput[]): Date[] {
  return dates.map(toDate).sort(compareAsc)
}

/**
 * Sorts dates in descending order
 */
export function sortDatesDescending(dates: TDateInput[]): Date[] {
  return dates.map(toDate).sort(compareDesc)
}

/**
 * Returns the earliest date from an array
 */
export function getEarliestDate(dates: TDateInput[]): Date {
  return min(dates.map(toDate))
}

/**
 * Returns the latest date from an array
 */
export function getLatestDate(dates: TDateInput[]): Date {
  return max(dates.map(toDate))
}

/**
 * Clamps a date to be within a range
 */
export function clampDate(date: TDateInput, minDate: TDateInput, maxDate: TDateInput): Date {
  return clamp(toDate(date), { start: toDate(minDate), end: toDate(maxDate) })
}

/**
 * Checks if a date is within a range (inclusive)
 */
export function isDateInRange(
  date: TDateInput,
  startDate: TDateInput,
  endDate: TDateInput
): boolean {
  const d = toDate(date)
  const start = toDate(startDate)
  const end = toDate(endDate)
  return (isAfter(d, start) || isEqual(d, start)) && (isBefore(d, end) || isEqual(d, end))
}

/**
 * Checks if two date ranges overlap
 */
export function doDateRangesOverlap(
  range1Start: TDateInput,
  range1End: TDateInput,
  range2Start: TDateInput,
  range2End: TDateInput
): boolean {
  const start1 = toDate(range1Start)
  const end1 = toDate(range1End)
  const start2 = toDate(range2Start)
  const end2 = toDate(range2End)

  return (
    (isBefore(start1, end2) || isEqual(start1, end2)) &&
    (isAfter(end1, start2) || isEqual(end1, start2))
  )
}
