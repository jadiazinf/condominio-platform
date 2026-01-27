import type { TManagementCompanySubscription } from '@packages/domain'
import type { ManagementCompanySubscriptionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICancelSubscriptionInput {
  subscriptionId: string
  cancelledBy: string
  cancellationReason?: string
}

/**
 * Service for cancelling a subscription.
 * Sets status to 'cancelled' and records cancellation details.
 */
export class CancelSubscriptionService {
  constructor(private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository) {}

  async execute(input: ICancelSubscriptionInput): Promise<TServiceResult<TManagementCompanySubscription>> {
    // Check if subscription exists
    const existing = await this.subscriptionsRepository.getById(input.subscriptionId)

    if (!existing) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Check if already cancelled
    if (existing.status === 'cancelled') {
      return failure('Subscription is already cancelled', 'BAD_REQUEST')
    }

    // Update subscription to cancelled status
    const cancelled = await this.subscriptionsRepository.update(input.subscriptionId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: input.cancelledBy,
      cancellationReason: input.cancellationReason ?? null,
      autoRenew: false,
    })

    if (!cancelled) {
      return failure('Failed to cancel subscription', 'INTERNAL_ERROR')
    }

    return success(cancelled)
  }
}
