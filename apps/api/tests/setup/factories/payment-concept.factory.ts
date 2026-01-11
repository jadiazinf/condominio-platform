import { faker } from '@faker-js/faker'
import type { TPaymentConceptCreate } from '@packages/domain'

/**
 * Factory for creating payment concept test data.
 */
export class PaymentConceptFactory {
  /**
   * Creates fake data for a payment concept.
   */
  static create(overrides: Partial<TPaymentConceptCreate> = {}): TPaymentConceptCreate {
    return {
      condominiumId: null,
      buildingId: null,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      conceptType: 'maintenance',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      currencyId: faker.string.uuid(),
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a maintenance concept.
   */
  static maintenance(overrides: Partial<TPaymentConceptCreate> = {}): TPaymentConceptCreate {
    return this.create({
      name: 'Mantenimiento',
      conceptType: 'maintenance',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      ...overrides,
    })
  }

  /**
   * Creates a condominium fee concept.
   */
  static condominiumFee(overrides: Partial<TPaymentConceptCreate> = {}): TPaymentConceptCreate {
    return this.create({
      name: 'Cuota de Condominio',
      conceptType: 'condominium_fee',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      ...overrides,
    })
  }

  /**
   * Creates an extraordinary concept.
   */
  static extraordinary(overrides: Partial<TPaymentConceptCreate> = {}): TPaymentConceptCreate {
    return this.create({
      name: 'Cuota Extraordinaria',
      conceptType: 'extraordinary',
      isRecurring: false,
      recurrencePeriod: null,
      ...overrides,
    })
  }

  /**
   * Creates a fine concept.
   */
  static fine(overrides: Partial<TPaymentConceptCreate> = {}): TPaymentConceptCreate {
    return this.create({
      name: 'Multa',
      conceptType: 'fine',
      isRecurring: false,
      recurrencePeriod: null,
      ...overrides,
    })
  }
}
