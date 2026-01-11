import { faker } from '@faker-js/faker'
import type { TPaymentCreate } from '@packages/domain'

/**
 * Factory for creating payment test data.
 */
export class PaymentFactory {
  /**
   * Creates fake data for a payment.
   */
  static create(overrides: Partial<TPaymentCreate> = {}): TPaymentCreate {
    return {
      paymentNumber: `PAY-${faker.string.alphanumeric(8).toUpperCase()}`,
      userId: faker.string.uuid(),
      unitId: faker.string.uuid(),
      amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }).toString(),
      currencyId: faker.string.uuid(),
      paidAmount: null,
      paidCurrencyId: null,
      exchangeRate: null,
      paymentMethod: 'transfer',
      paymentGatewayId: null,
      paymentDetails: null,
      paymentDate: faker.date.recent().toISOString().split('T')[0]!,
      status: 'completed',
      receiptUrl: null,
      receiptNumber: null,
      notes: null,
      metadata: null,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a pending verification payment.
   */
  static pendingVerification(overrides: Partial<TPaymentCreate> = {}): TPaymentCreate {
    return this.create({
      status: 'pending_verification',
      paymentMethod: 'transfer',
      ...overrides,
    })
  }

  /**
   * Creates a completed payment.
   */
  static completed(overrides: Partial<TPaymentCreate> = {}): TPaymentCreate {
    return this.create({
      status: 'completed',
      ...overrides,
    })
  }

  /**
   * Creates a rejected payment.
   */
  static rejected(overrides: Partial<TPaymentCreate> = {}): TPaymentCreate {
    return this.create({
      status: 'rejected',
      ...overrides,
    })
  }

  /**
   * Creates a payment via gateway.
   */
  static viaGateway(
    paymentGatewayId: string,
    overrides: Partial<TPaymentCreate> = {}
  ): TPaymentCreate {
    return this.create({
      paymentMethod: 'gateway',
      paymentGatewayId,
      status: 'pending',
      ...overrides,
    })
  }
}
