import { describe, it, expect } from 'bun:test'
import { parseAmount, roundCurrency, toDecimal, toCents, fromCents, sumAmounts } from '../src/money'

describe('parseAmount', () => {
  it('parses a decimal string', () => {
    expect(parseAmount('150.25')).toBe(150.25)
  })

  it('returns 0 for null', () => {
    expect(parseAmount(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(parseAmount(undefined)).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0)
  })

  it('returns 0 for NaN string', () => {
    expect(parseAmount('abc')).toBe(0)
  })

  it('passes through a number', () => {
    expect(parseAmount(42.5)).toBe(42.5)
  })

  it('handles negative amounts', () => {
    expect(parseAmount('-10.50')).toBe(-10.5)
  })

  it('handles zero string', () => {
    expect(parseAmount('0')).toBe(0)
  })

  it('handles "0.00"', () => {
    expect(parseAmount('0.00')).toBe(0)
  })
})

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.005)).toBe(10.01)
  })

  it('does not change already rounded values', () => {
    expect(roundCurrency(150.25)).toBe(150.25)
  })

  it('rounds down correctly', () => {
    expect(roundCurrency(10.004)).toBe(10.0)
  })

  it('handles negative values', () => {
    expect(roundCurrency(-10.005)).toBe(-10.01)
  })

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0)
  })

  it('handles large numbers without drift', () => {
    expect(roundCurrency(999999.995)).toBe(1000000.0)
  })

  it('avoids IEEE 754 floating-point errors (0.1 + 0.2)', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
  })
})

describe('toDecimal', () => {
  it('formats integer as 2-decimal string', () => {
    expect(toDecimal(150)).toBe('150.00')
  })

  it('formats float as 2-decimal string', () => {
    expect(toDecimal(150.5)).toBe('150.50')
  })

  it('rounds and formats', () => {
    expect(toDecimal(10.005)).toBe('10.01')
  })

  it('handles zero', () => {
    expect(toDecimal(0)).toBe('0.00')
  })

  it('handles negative', () => {
    expect(toDecimal(-25.1)).toBe('-25.10')
  })
})

describe('toCents', () => {
  it('converts string to cents', () => {
    expect(toCents('150.25')).toBe(15025)
  })

  it('converts number to cents', () => {
    expect(toCents(150.25)).toBe(15025)
  })

  it('handles floating-point edge case (19.99)', () => {
    expect(toCents('19.99')).toBe(1999)
  })

  it('handles whole numbers', () => {
    expect(toCents('100')).toBe(10000)
  })

  it('handles zero', () => {
    expect(toCents('0')).toBe(0)
  })
})

describe('fromCents', () => {
  it('converts cents to decimal string', () => {
    expect(fromCents(15025)).toBe('150.25')
  })

  it('handles zero', () => {
    expect(fromCents(0)).toBe('0.00')
  })

  it('handles single-digit cents', () => {
    expect(fromCents(5)).toBe('0.05')
  })

  it('handles large values', () => {
    expect(fromCents(99999999)).toBe('999999.99')
  })
})

describe('sumAmounts', () => {
  it('sums multiple string amounts', () => {
    expect(sumAmounts('100.00', '50.25', '25.75')).toBe(176)
  })

  it('handles nulls and undefined', () => {
    expect(sumAmounts('100.00', null, undefined, '50.00')).toBe(150)
  })

  it('handles empty call', () => {
    expect(sumAmounts()).toBe(0)
  })

  it('handles mixed numbers and strings', () => {
    expect(sumAmounts(100, '50.50')).toBe(150.5)
  })
})

describe('real-world financial scenarios', () => {
  it('quota balance calculation: effective + interest - paid', () => {
    const baseAmount = parseAmount('1000.00')
    const adjustments = parseAmount('0')
    const effective = baseAmount + adjustments
    const interest = parseAmount('15.50')
    const paid = parseAmount('500.00')
    const balance = roundCurrency(effective + interest - paid)
    expect(toDecimal(balance)).toBe('515.50')
  })

  it('payment distribution: split $100 among 3 units equally', () => {
    const total = toCents('100.00')
    const perUnit = Math.floor(total / 3)
    const remainder = total - perUnit * 3
    const amounts = [perUnit, perUnit, perUnit + remainder]
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(total) // no cent lost
    expect(fromCents(amounts[0]!)).toBe('33.33')
    expect(fromCents(amounts[2]!)).toBe('33.34')
  })

  it('early discount: 10% off $150.25', () => {
    const base = parseAmount('150.25')
    const discount = roundCurrency(base * 0.1)
    expect(toDecimal(discount)).toBe('15.03') // rounded correctly
    expect(toDecimal(base - discount)).toBe('135.22') // rounded to prevent drift
  })

  it('compound interest: 5% on $1000 for 3 periods', () => {
    const principal = parseAmount('1000.00')
    const rate = 0.05
    const periods = 3
    const interest = roundCurrency(principal * (Math.pow(1 + rate, periods) - 1))
    expect(toDecimal(interest)).toBe('157.63')
  })
})
