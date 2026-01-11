import { faker } from '@faker-js/faker'
import type { TQuotaCreate } from '@packages/domain'

/**
 * Factory for creating quota test data.
 */
export class QuotaFactory {
  /**
   * Creates fake data for a quota.
   */
  static create(overrides: Partial<TQuotaCreate> = {}): TQuotaCreate {
    const year = faker.date.recent().getFullYear()
    const month = faker.number.int({ min: 1, max: 12 })
    const baseAmount = overrides.baseAmount ?? faker.number.float({ min: 50, max: 500, fractionDigits: 2 }).toString()

    return {
      unitId: faker.string.uuid(),
      paymentConceptId: faker.string.uuid(),
      periodYear: year,
      periodMonth: month,
      periodDescription: `${year}-${month.toString().padStart(2, '0')}`,
      baseAmount,
      currencyId: faker.string.uuid(),
      interestAmount: '0.00',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: faker.date.recent().toISOString().split('T')[0]!,
      dueDate: faker.date.soon({ days: 15 }).toISOString().split('T')[0]!,
      status: 'pending',
      paidAmount: '0.00',
      balance: baseAmount,
      notes: null,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a pending quota.
   */
  static pending(overrides: Partial<TQuotaCreate> = {}): TQuotaCreate {
    return this.create({
      status: 'pending',
      paidAmount: '0.00',
      ...overrides,
    })
  }

  /**
   * Creates a paid quota.
   */
  static paid(overrides: Partial<TQuotaCreate> = {}): TQuotaCreate {
    const baseAmount = overrides.baseAmount || '100.00'
    return this.create({
      status: 'paid',
      baseAmount,
      paidAmount: baseAmount,
      balance: '0.00',
      ...overrides,
    })
  }

  /**
   * Creates an overdue quota.
   */
  static overdue(overrides: Partial<TQuotaCreate> = {}): TQuotaCreate {
    return this.create({
      status: 'overdue',
      dueDate: faker.date.past().toISOString().split('T')[0]!,
      interestAmount: faker.number.float({ min: 5, max: 50, fractionDigits: 2 }).toString(),
      ...overrides,
    })
  }

  /**
   * Creates a cancelled quota.
   */
  static cancelled(overrides: Partial<TQuotaCreate> = {}): TQuotaCreate {
    return this.create({
      status: 'cancelled',
      ...overrides,
    })
  }
}
