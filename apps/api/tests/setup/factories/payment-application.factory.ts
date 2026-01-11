import { faker } from '@faker-js/faker'
import type { TPaymentApplicationCreate } from '@packages/domain'

/**
 * Factory for creating payment application test data.
 */
export class PaymentApplicationFactory {
  /**
   * Creates fake data for a payment application.
   */
  static create(overrides: Partial<TPaymentApplicationCreate> = {}): TPaymentApplicationCreate {
    const appliedAmount = faker.number.float({ min: 10, max: 100, fractionDigits: 2 })
    return {
      paymentId: faker.string.uuid(),
      quotaId: faker.string.uuid(),
      appliedAmount: appliedAmount.toString(),
      appliedToPrincipal: appliedAmount.toString(),
      appliedToInterest: '0.00',
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates an application to principal only.
   */
  static toPrincipal(
    paymentId: string,
    quotaId: string,
    amount: string,
    overrides: Partial<TPaymentApplicationCreate> = {}
  ): TPaymentApplicationCreate {
    return this.create({
      paymentId,
      quotaId,
      appliedAmount: amount,
      appliedToPrincipal: amount,
      appliedToInterest: '0.00',
      ...overrides,
    })
  }

  /**
   * Creates an application with interest.
   */
  static withInterest(
    paymentId: string,
    quotaId: string,
    principal: string,
    interest: string,
    overrides: Partial<TPaymentApplicationCreate> = {}
  ): TPaymentApplicationCreate {
    const total = (parseFloat(principal) + parseFloat(interest)).toFixed(2)
    return this.create({
      paymentId,
      quotaId,
      appliedAmount: total,
      appliedToPrincipal: principal,
      appliedToInterest: interest,
      ...overrides,
    })
  }
}
