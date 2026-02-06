import type {
  TSubscriptionAuditHistory,
  TSubscriptionAuditAction,
  TManagementCompanySubscription,
} from '@packages/domain'
import type { SubscriptionAuditHistoryRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateAuditEntryInput {
  subscriptionId: string
  action: TSubscriptionAuditAction
  previousValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  changedFields?: string[] | null
  performedBy: string | null
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Service for managing subscription audit history.
 * Automatically logs all subscription changes for traceability.
 */
export class SubscriptionAuditService {
  constructor(private readonly auditRepository: SubscriptionAuditHistoryRepository) {}

  /**
   * Create a manual audit entry
   */
  async createEntry(input: ICreateAuditEntryInput): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    const entry = await this.auditRepository.create({
      subscriptionId: input.subscriptionId,
      action: input.action,
      previousValues: input.previousValues ?? null,
      newValues: input.newValues ?? null,
      changedFields: input.changedFields ?? null,
      performedBy: input.performedBy,
      performedAt: new Date(),
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })

    return success(entry)
  }

  /**
   * Log subscription creation
   */
  async logCreation(
    subscription: TManagementCompanySubscription,
    performedBy: string | null,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId: subscription.id,
      action: 'created',
      previousValues: null,
      newValues: this.subscriptionToRecord(subscription),
      changedFields: null,
      performedBy,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log subscription activation
   */
  async logActivation(
    subscription: TManagementCompanySubscription,
    performedBy: string | null,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId: subscription.id,
      action: 'activated',
      previousValues: { status: 'inactive' },
      newValues: { status: 'active' },
      changedFields: ['status'],
      performedBy,
      reason,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log subscription deactivation
   */
  async logDeactivation(
    subscription: TManagementCompanySubscription,
    performedBy: string | null,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId: subscription.id,
      action: 'deactivated',
      previousValues: { status: subscription.status },
      newValues: { status: 'inactive' },
      changedFields: ['status'],
      performedBy,
      reason,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log subscription update with change detection
   */
  async logUpdate(
    subscriptionId: string,
    previousValues: Partial<TManagementCompanySubscription>,
    newValues: Partial<TManagementCompanySubscription>,
    performedBy: string | null,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    const changedFields = this.detectChangedFields(previousValues, newValues)

    return this.createEntry({
      subscriptionId,
      action: 'updated',
      previousValues: previousValues as Record<string, unknown>,
      newValues: newValues as Record<string, unknown>,
      changedFields,
      performedBy,
      reason,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log subscription cancellation
   */
  async logCancellation(
    subscription: TManagementCompanySubscription,
    performedBy: string | null,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId: subscription.id,
      action: 'cancelled',
      previousValues: { status: subscription.status },
      newValues: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: performedBy,
        cancellationReason: reason,
      },
      changedFields: ['status', 'cancelledAt', 'cancelledBy', 'cancellationReason'],
      performedBy,
      reason,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log subscription renewal
   */
  async logRenewal(
    subscription: TManagementCompanySubscription,
    newEndDate: Date,
    newNextBillingDate: Date,
    performedBy: string | null,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId: subscription.id,
      action: 'renewed',
      previousValues: {
        endDate: subscription.endDate?.toISOString(),
        nextBillingDate: subscription.nextBillingDate?.toISOString(),
      },
      newValues: {
        endDate: newEndDate.toISOString(),
        nextBillingDate: newNextBillingDate.toISOString(),
      },
      changedFields: ['endDate', 'nextBillingDate'],
      performedBy,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log terms acceptance
   */
  async logTermsAcceptance(
    subscriptionId: string,
    acceptedBy: string,
    termsVersion: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId,
      action: 'terms_accepted',
      previousValues: { status: 'inactive' },
      newValues: {
        status: 'active',
        termsVersion,
        acceptedAt: new Date().toISOString(),
      },
      changedFields: ['status'],
      performedBy: acceptedBy,
      reason: `Terms & conditions version ${termsVersion} accepted`,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Log price change
   */
  async logPriceChange(
    subscriptionId: string,
    previousPrice: number,
    newPrice: number,
    performedBy: string | null,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<TServiceResult<TSubscriptionAuditHistory>> {
    return this.createEntry({
      subscriptionId,
      action: 'price_changed',
      previousValues: { basePrice: previousPrice },
      newValues: { basePrice: newPrice },
      changedFields: ['basePrice'],
      performedBy,
      reason,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    })
  }

  /**
   * Get audit history for a subscription
   */
  async getHistory(subscriptionId: string): Promise<TServiceResult<TSubscriptionAuditHistory[]>> {
    const history = await this.auditRepository.getBySubscriptionId(subscriptionId)
    return success(history)
  }

  /**
   * Convert subscription to a plain record for logging
   */
  private subscriptionToRecord(subscription: TManagementCompanySubscription): Record<string, unknown> {
    return {
      id: subscription.id,
      managementCompanyId: subscription.managementCompanyId,
      subscriptionName: subscription.subscriptionName,
      billingCycle: subscription.billingCycle,
      basePrice: subscription.basePrice,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString() ?? null,
      maxCondominiums: subscription.maxCondominiums,
      maxUsers: subscription.maxUsers,
      maxStorageGb: subscription.maxStorageGb,
      autoRenew: subscription.autoRenew,
    }
  }

  /**
   * Detect which fields changed between two objects
   */
  private detectChangedFields(
    previous: Record<string, unknown>,
    current: Record<string, unknown>
  ): string[] {
    const changedFields: string[] = []
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)])

    for (const key of allKeys) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changedFields.push(key)
      }
    }

    return changedFields
  }
}
