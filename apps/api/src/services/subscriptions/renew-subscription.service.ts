import type { TManagementCompanySubscription, TBillingCycle } from '@packages/domain'
import type { ManagementCompanySubscriptionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRenewSubscriptionInput {
  subscriptionId: string
  billingCycle?: TBillingCycle
  basePrice?: number
}

/**
 * Service for renewing a subscription.
 * Changes status from trial to active, or renews an active subscription.
 */
export class RenewSubscriptionService {
  constructor(private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository) {}

  async execute(input: IRenewSubscriptionInput): Promise<TServiceResult<TManagementCompanySubscription>> {
    // Check if subscription exists
    const existing = await this.subscriptionsRepository.getById(input.subscriptionId)

    if (!existing) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Check if can be renewed
    if (existing.status === 'cancelled') {
      return failure('Cannot renew a cancelled subscription', 'BAD_REQUEST')
    }

    // Calculate next billing date based on billing cycle
    const nextBillingDate = this.calculateNextBillingDate(
      input.billingCycle ?? existing.billingCycle
    )

    // Update subscription
    const updateData: Partial<TManagementCompanySubscription> = {
      status: 'active',
      nextBillingDate,
    }

    // Update billing cycle if provided
    if (input.billingCycle && input.billingCycle !== existing.billingCycle) {
      updateData.billingCycle = input.billingCycle
    }

    // Update price if provided
    if (input.basePrice !== undefined) {
      updateData.basePrice = input.basePrice
    }

    const renewed = await this.subscriptionsRepository.update(input.subscriptionId, updateData)

    if (!renewed) {
      return failure('Failed to renew subscription', 'INTERNAL_ERROR')
    }

    return success(renewed)
  }

  private calculateNextBillingDate(billingCycle: TBillingCycle): Date {
    const now = new Date()
    const nextDate = new Date(now)

    switch (billingCycle) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3)
        break
      case 'semi_annual':
        nextDate.setMonth(nextDate.getMonth() + 6)
        break
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      case 'custom':
        // For custom, default to 30 days
        nextDate.setDate(nextDate.getDate() + 30)
        break
    }

    return nextDate
  }
}
