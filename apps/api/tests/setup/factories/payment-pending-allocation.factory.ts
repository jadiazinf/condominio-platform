import { faker } from '@faker-js/faker'
import type { TPaymentPendingAllocationCreate } from '@packages/domain'

/**
 * Factory for creating payment pending allocation test data.
 */
export class PaymentPendingAllocationFactory {
  /**
   * Creates fake data for a payment pending allocation.
   */
  static create(
    overrides: Partial<TPaymentPendingAllocationCreate> = {}
  ): TPaymentPendingAllocationCreate {
    return {
      paymentId: faker.string.uuid(),
      pendingAmount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }).toString(),
      currencyId: faker.string.uuid(),
      status: 'pending',
      ...overrides,
    }
  }

  /**
   * Creates a pending allocation.
   */
  static pending(
    paymentId: string,
    amount: string,
    currencyId: string,
    overrides: Partial<TPaymentPendingAllocationCreate> = {}
  ): TPaymentPendingAllocationCreate {
    return this.create({
      paymentId,
      pendingAmount: amount,
      currencyId,
      status: 'pending',
      ...overrides,
    })
  }

  /**
   * Creates an allocated allocation.
   * Note: resolutionType, allocatedToQuotaId, allocatedBy are only in Update DTO
   */
  static allocated(
    paymentId: string,
    quotaId: string,
    overrides: Partial<TPaymentPendingAllocationCreate> = {}
  ): TPaymentPendingAllocationCreate {
    return this.create({
      paymentId,
      status: 'allocated',
      ...overrides,
    })
  }

  /**
   * Creates a refunded allocation.
   * Note: resolutionType, resolutionNotes, allocatedBy are only in Update DTO
   */
  static refunded(
    paymentId: string,
    overrides: Partial<TPaymentPendingAllocationCreate> = {}
  ): TPaymentPendingAllocationCreate {
    return this.create({
      paymentId,
      status: 'refunded',
      ...overrides,
    })
  }
}
