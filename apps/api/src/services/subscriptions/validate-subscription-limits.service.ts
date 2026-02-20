import type {
  ManagementCompanySubscriptionsRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TResourceType = 'condominium' | 'unit' | 'user'

export interface IValidateLimitsInput {
  managementCompanyId: string
  resourceType: TResourceType
  requestedCount?: number
}

export interface IValidateLimitsResult {
  canCreate: boolean
  currentCount: number
  maxAllowed: number | null // null = unlimited
  requestedCount: number
  limitReached: boolean
}

/**
 * Service to validate if a management company can create more resources
 * based on their active subscription limits.
 *
 * Logic:
 * 1. Get active subscription for the company
 * 2. If no subscription exists, return canCreate: false
 * 3. Get current usage stats from the company repository
 * 4. Compare current count vs max limit for the resource type
 * 5. Return validation result
 */
export class ValidateSubscriptionLimitsService {
  constructor(
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    private readonly companiesRepository: ManagementCompaniesRepository
  ) {}

  async execute(input: IValidateLimitsInput): Promise<TServiceResult<IValidateLimitsResult>> {
    const { managementCompanyId, resourceType, requestedCount = 1 } = input

    // 1. Get active subscription
    const subscription = await this.subscriptionsRepository.getActiveByCompanyId(managementCompanyId)

    if (!subscription) {
      return failure('No active subscription found for this management company', 'NOT_FOUND')
    }

    // 2. Get current usage stats
    const usageStats = await this.companiesRepository.getUsageStats(managementCompanyId)

    // 3. Extract relevant counts based on resource type
    let currentCount: number
    let maxAllowed: number | null

    switch (resourceType) {
      case 'condominium':
        currentCount = usageStats.condominiumsCount
        maxAllowed = subscription.maxCondominiums
        break
      case 'unit':
        currentCount = usageStats.unitsCount
        maxAllowed = subscription.maxUnits
        break
      case 'user':
        currentCount = usageStats.usersCount
        maxAllowed = subscription.maxUsers
        break
      default:
        return failure('Invalid resource type', 'BAD_REQUEST')
    }

    // 4. Determine if can create
    // null maxAllowed means unlimited
    const limitReached = maxAllowed !== null && currentCount + requestedCount > maxAllowed
    const canCreate = !limitReached

    return success({
      canCreate,
      currentCount,
      maxAllowed,
      requestedCount,
      limitReached,
    })
  }
}
