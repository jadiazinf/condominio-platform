import { eq, and, sql, desc, lte, ilike, gte } from 'drizzle-orm'
import type {
  TManagementCompanySubscription,
  TManagementCompanySubscriptionCreate,
  TManagementCompanySubscriptionUpdate,
  TSubscriptionStatus,
  TPaginatedResponse,
} from '@packages/domain'

export interface ISubscriptionHistoryQuery {
  page?: number
  limit?: number
  search?: string
  startDateFrom?: Date
  startDateTo?: Date
}
import { managementCompanySubscriptions } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TSubscriptionRecord = typeof managementCompanySubscriptions.$inferSelect

/**
 * Repository for managing subscription entities.
 * Handles custom subscriptions for management companies.
 */
export class ManagementCompanySubscriptionsRepository
  extends BaseRepository<
    typeof managementCompanySubscriptions,
    TManagementCompanySubscription,
    TManagementCompanySubscriptionCreate,
    TManagementCompanySubscriptionUpdate
  >
  implements
    IRepository<
      TManagementCompanySubscription,
      TManagementCompanySubscriptionCreate,
      TManagementCompanySubscriptionUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, managementCompanySubscriptions)
  }

  protected mapToEntity(record: unknown): TManagementCompanySubscription {
    const r = record as TSubscriptionRecord
    return {
      id: r.id,
      managementCompanyId: r.managementCompanyId,
      subscriptionName: r.subscriptionName,
      billingCycle: r.billingCycle,
      basePrice: Number(r.basePrice),
      currencyId: r.currencyId,
      // Pricing calculation data
      pricingCondominiumCount: r.pricingCondominiumCount,
      pricingUnitCount: r.pricingUnitCount,
      pricingCondominiumRate: r.pricingCondominiumRate ? Number(r.pricingCondominiumRate) : null,
      pricingUnitRate: r.pricingUnitRate ? Number(r.pricingUnitRate) : null,
      calculatedPrice: r.calculatedPrice ? Number(r.calculatedPrice) : null,
      // Discount
      discountType: r.discountType,
      discountValue: r.discountValue ? Number(r.discountValue) : null,
      discountAmount: r.discountAmount ? Number(r.discountAmount) : null,
      pricingNotes: r.pricingNotes,
      rateId: r.rateId,
      // Limits
      maxCondominiums: r.maxCondominiums,
      maxUnits: r.maxUnits,
      maxUsers: r.maxUsers,
      maxStorageGb: r.maxStorageGb,
      customFeatures: r.customFeatures as Record<string, boolean> | null,
      customRules: r.customRules as Record<string, unknown> | null,
      status: r.status,
      startDate: r.startDate ?? new Date(),
      endDate: r.endDate,
      nextBillingDate: r.nextBillingDate,
      trialEndsAt: r.trialEndsAt,
      autoRenew: r.autoRenew ?? true,
      notes: r.notes,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      createdBy: r.createdBy,
      cancelledAt: r.cancelledAt,
      cancelledBy: r.cancelledBy,
      cancellationReason: r.cancellationReason,
    }
  }

  protected mapToInsertValues(dto: TManagementCompanySubscriptionCreate): Record<string, unknown> {
    return {
      managementCompanyId: dto.managementCompanyId,
      subscriptionName: dto.subscriptionName,
      billingCycle: dto.billingCycle,
      basePrice: dto.basePrice.toString(),
      currencyId: dto.currencyId,
      // Pricing calculation data
      pricingCondominiumCount: dto.pricingCondominiumCount,
      pricingUnitCount: dto.pricingUnitCount,
      pricingCondominiumRate: dto.pricingCondominiumRate?.toString(),
      pricingUnitRate: dto.pricingUnitRate?.toString(),
      calculatedPrice: dto.calculatedPrice?.toString(),
      // Discount
      discountType: dto.discountType,
      discountValue: dto.discountValue?.toString(),
      discountAmount: dto.discountAmount?.toString(),
      pricingNotes: dto.pricingNotes,
      rateId: dto.rateId,
      // Limits
      maxCondominiums: dto.maxCondominiums,
      maxUnits: dto.maxUnits,
      maxUsers: dto.maxUsers,
      maxStorageGb: dto.maxStorageGb,
      customFeatures: dto.customFeatures,
      customRules: dto.customRules,
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      nextBillingDate: dto.nextBillingDate,
      trialEndsAt: dto.trialEndsAt,
      autoRenew: dto.autoRenew,
      notes: dto.notes,
      createdBy: dto.createdBy,
      cancelledAt: dto.cancelledAt,
      cancelledBy: dto.cancelledBy,
      cancellationReason: dto.cancellationReason,
    }
  }

  protected mapToUpdateValues(dto: TManagementCompanySubscriptionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.managementCompanyId !== undefined) values.managementCompanyId = dto.managementCompanyId
    if (dto.subscriptionName !== undefined) values.subscriptionName = dto.subscriptionName
    if (dto.billingCycle !== undefined) values.billingCycle = dto.billingCycle
    if (dto.basePrice !== undefined) values.basePrice = dto.basePrice.toString()
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    // Pricing calculation data
    if (dto.pricingCondominiumCount !== undefined) values.pricingCondominiumCount = dto.pricingCondominiumCount
    if (dto.pricingUnitCount !== undefined) values.pricingUnitCount = dto.pricingUnitCount
    if (dto.pricingCondominiumRate !== undefined)
      values.pricingCondominiumRate = dto.pricingCondominiumRate?.toString()
    if (dto.pricingUnitRate !== undefined) values.pricingUnitRate = dto.pricingUnitRate?.toString()
    if (dto.calculatedPrice !== undefined) values.calculatedPrice = dto.calculatedPrice?.toString()
    // Discount
    if (dto.discountType !== undefined) values.discountType = dto.discountType
    if (dto.discountValue !== undefined) values.discountValue = dto.discountValue?.toString()
    if (dto.discountAmount !== undefined) values.discountAmount = dto.discountAmount?.toString()
    if (dto.pricingNotes !== undefined) values.pricingNotes = dto.pricingNotes
    if (dto.rateId !== undefined) values.rateId = dto.rateId
    // Limits
    if (dto.maxCondominiums !== undefined) values.maxCondominiums = dto.maxCondominiums
    if (dto.maxUnits !== undefined) values.maxUnits = dto.maxUnits
    if (dto.maxUsers !== undefined) values.maxUsers = dto.maxUsers
    if (dto.maxStorageGb !== undefined) values.maxStorageGb = dto.maxStorageGb
    if (dto.customFeatures !== undefined) values.customFeatures = dto.customFeatures
    if (dto.customRules !== undefined) values.customRules = dto.customRules
    if (dto.status !== undefined) values.status = dto.status
    if (dto.startDate !== undefined) values.startDate = dto.startDate
    if (dto.endDate !== undefined) values.endDate = dto.endDate
    if (dto.nextBillingDate !== undefined) values.nextBillingDate = dto.nextBillingDate
    if (dto.trialEndsAt !== undefined) values.trialEndsAt = dto.trialEndsAt
    if (dto.autoRenew !== undefined) values.autoRenew = dto.autoRenew
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy
    if (dto.cancelledAt !== undefined) values.cancelledAt = dto.cancelledAt
    if (dto.cancelledBy !== undefined) values.cancelledBy = dto.cancelledBy
    if (dto.cancellationReason !== undefined) values.cancellationReason = dto.cancellationReason

    return values
  }

  /**
   * Get active subscription by management company ID (trial or active status)
   */
  async getActiveByCompanyId(companyId: string): Promise<TManagementCompanySubscription | null> {
    const results = await this.db
      .select()
      .from(managementCompanySubscriptions)
      .where(
        and(
          eq(managementCompanySubscriptions.managementCompanyId, companyId),
          sql`${managementCompanySubscriptions.status} IN ('trial', 'active')`
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get all subscriptions (including inactive) by management company ID
   */
  async getByCompanyId(companyId: string): Promise<TManagementCompanySubscription[]> {
    const results = await this.db
      .select()
      .from(managementCompanySubscriptions)
      .where(eq(managementCompanySubscriptions.managementCompanyId, companyId))
      .orderBy(desc(managementCompanySubscriptions.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get paginated subscriptions by management company ID with filtering
   */
  async getByCompanyIdPaginated(
    companyId: string,
    query: ISubscriptionHistoryQuery
  ): Promise<TPaginatedResponse<TManagementCompanySubscription>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(managementCompanySubscriptions.managementCompanyId, companyId)]

    if (query.search) {
      conditions.push(ilike(managementCompanySubscriptions.subscriptionName, `%${query.search}%`))
    }

    if (query.startDateFrom) {
      conditions.push(gte(managementCompanySubscriptions.startDate, query.startDateFrom))
    }

    if (query.startDateTo) {
      conditions.push(lte(managementCompanySubscriptions.startDate, query.startDateTo))
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(managementCompanySubscriptions)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    // Get paginated results
    const results = await this.db
      .select()
      .from(managementCompanySubscriptions)
      .where(whereClause)
      .orderBy(desc(managementCompanySubscriptions.createdAt))
      .limit(limit)
      .offset(offset)

    const data = results.map(record => this.mapToEntity(record))
    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  /**
   * Update subscription status
   */
  async updateStatus(id: string, status: TSubscriptionStatus): Promise<TManagementCompanySubscription | null> {
    const results = await this.db
      .update(managementCompanySubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(managementCompanySubscriptions.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get subscriptions expiring within specified days
   */
  async getExpiringSubscriptions(days: number): Promise<TManagementCompanySubscription[]> {
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)

    const results = await this.db
      .select()
      .from(managementCompanySubscriptions)
      .where(
        and(
          sql`${managementCompanySubscriptions.status} IN ('trial', 'active')`,
          lte(managementCompanySubscriptions.nextBillingDate, expirationDate)
        )
      )
      .orderBy(managementCompanySubscriptions.nextBillingDate)

    return results.map(record => this.mapToEntity(record))
  }
}
