import type { TManagementCompanySubscription, TManagementCompanySubscriptionUpdate } from '@packages/domain'
import type { ManagementCompanySubscriptionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdateSubscriptionInput {
  subscriptionId: string
  data: TManagementCompanySubscriptionUpdate
}

/**
 * Service for updating an existing subscription.
 */
export class UpdateSubscriptionService {
  constructor(private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository) {}

  async execute(input: IUpdateSubscriptionInput): Promise<TServiceResult<TManagementCompanySubscription>> {
    // Check if subscription exists
    const existing = await this.subscriptionsRepository.getById(input.subscriptionId)

    if (!existing) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Prevent changing status directly (use cancel/renew services instead)
    if (input.data.status && input.data.status !== existing.status) {
      return failure('Use cancel or renew service to change subscription status', 'BAD_REQUEST')
    }

    // Update subscription
    const updated = await this.subscriptionsRepository.update(input.subscriptionId, input.data)

    if (!updated) {
      return failure('Failed to update subscription', 'INTERNAL_ERROR')
    }

    return success(updated)
  }
}
