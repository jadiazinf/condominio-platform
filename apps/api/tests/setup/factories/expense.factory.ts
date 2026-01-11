import { faker } from '@faker-js/faker'
import type { TExpenseCreate } from '@packages/domain'

/**
 * Factory for creating expense test data.
 */
export class ExpenseFactory {
  /**
   * Creates fake data for an expense.
   */
  static create(overrides: Partial<TExpenseCreate> = {}): TExpenseCreate {
    return {
      condominiumId: null,
      buildingId: null,
      expenseCategoryId: faker.string.uuid(),
      description: faker.commerce.productDescription(),
      amount: faker.number.float({ min: 50, max: 5000, fractionDigits: 2 }).toString(),
      currencyId: faker.string.uuid(),
      expenseDate: faker.date.recent().toISOString().split('T')[0]!,
      status: 'pending',
      vendorName: null,
      vendorTaxId: null,
      invoiceNumber: null,
      invoiceUrl: null,
      notes: null,
      metadata: null,
      createdBy: null,
      approvedBy: null,
      approvedAt: null,
      ...overrides,
    }
  }

  /**
   * Creates a pending expense.
   */
  static pending(overrides: Partial<TExpenseCreate> = {}): TExpenseCreate {
    return this.create({
      status: 'pending',
      ...overrides,
    })
  }

  /**
   * Creates an approved expense.
   * NOTE: approvedBy must be provided with a real user ID when inserting into DB.
   */
  static approved(overrides: Partial<TExpenseCreate> = {}): TExpenseCreate {
    return this.create({
      status: 'approved',
      approvedAt: new Date(),
      ...overrides,
    })
  }

  /**
   * Creates a paid expense.
   * NOTE: approvedBy must be provided with a real user ID when inserting into DB.
   */
  static paid(overrides: Partial<TExpenseCreate> = {}): TExpenseCreate {
    return this.create({
      status: 'paid',
      approvedAt: new Date(),
      ...overrides,
    })
  }

  /**
   * Creates a rejected expense.
   */
  static rejected(overrides: Partial<TExpenseCreate> = {}): TExpenseCreate {
    return this.create({
      status: 'rejected',
      ...overrides,
    })
  }
}
