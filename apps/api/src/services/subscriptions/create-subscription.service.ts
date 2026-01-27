import type { TManagementCompanySubscription, TManagementCompanySubscriptionCreate } from '@packages/domain'
import type { ManagementCompanySubscriptionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateSubscriptionInput extends TManagementCompanySubscriptionCreate {}

/**
 * Service for creating a new subscription for a management company.
 */
export class CreateSubscriptionService {
  constructor(private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository) {}

  async execute(input: ICreateSubscriptionInput): Promise<TServiceResult<TManagementCompanySubscription>> {
    // Check if there's already an active or trial subscription
    const existingSubscription = await this.subscriptionsRepository.getActiveByCompanyId(
      input.managementCompanyId
    )

    if (existingSubscription) {
      return failure(
        `Management company already has an ${existingSubscription.status} subscription`,
        'CONFLICT'
      )
    }

    // Create subscription
    const subscription = await this.subscriptionsRepository.create(input)

    return success(subscription)
  }
}
