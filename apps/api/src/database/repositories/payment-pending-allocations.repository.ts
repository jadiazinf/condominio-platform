import { and, eq, desc } from 'drizzle-orm'
import type {
  TPaymentPendingAllocation,
  TPaymentPendingAllocationCreate,
  TPaymentPendingAllocationUpdate,
  TAllocationStatus,
} from '@packages/domain'
import { paymentPendingAllocations } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TPaymentPendingAllocationRecord = typeof paymentPendingAllocations.$inferSelect

/**
 * Repository for managing payment pending allocation entities.
 * Pending allocations represent excess payment amounts that need
 * administrative resolution (allocation to future quotas or refund).
 */
export class PaymentPendingAllocationsRepository
  extends BaseRepository<
    typeof paymentPendingAllocations,
    TPaymentPendingAllocation,
    TPaymentPendingAllocationCreate,
    TPaymentPendingAllocationUpdate
  >
  implements IRepository<TPaymentPendingAllocation, TPaymentPendingAllocationCreate, TPaymentPendingAllocationUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, paymentPendingAllocations)
  }

  protected mapToEntity(record: unknown): TPaymentPendingAllocation {
    const r = record as TPaymentPendingAllocationRecord
    return {
      id: r.id,
      paymentId: r.paymentId,
      pendingAmount: r.pendingAmount,
      currencyId: r.currencyId,
      status: r.status as TAllocationStatus,
      resolutionType: r.resolutionType,
      resolutionNotes: r.resolutionNotes,
      allocatedToQuotaId: r.allocatedToQuotaId,
      createdAt: r.createdAt ?? new Date(),
      allocatedBy: r.allocatedBy,
      allocatedAt: r.allocatedAt,
    }
  }

  protected mapToInsertValues(dto: TPaymentPendingAllocationCreate): Record<string, unknown> {
    return {
      paymentId: dto.paymentId,
      pendingAmount: dto.pendingAmount,
      currencyId: dto.currencyId,
      status: dto.status,
    }
  }

  protected mapToUpdateValues(dto: TPaymentPendingAllocationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.status !== undefined) values.status = dto.status
    if (dto.resolutionType !== undefined) values.resolutionType = dto.resolutionType
    if (dto.resolutionNotes !== undefined) values.resolutionNotes = dto.resolutionNotes
    if (dto.allocatedToQuotaId !== undefined) values.allocatedToQuotaId = dto.allocatedToQuotaId
    if (dto.allocatedBy !== undefined) values.allocatedBy = dto.allocatedBy

    // Set allocatedAt when allocation is made
    if (dto.status === 'allocated' || dto.status === 'refunded') {
      values.allocatedAt = new Date()
    }

    return values
  }

  /**
   * Retrieves pending allocations by payment.
   */
  async getByPaymentId(paymentId: string): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(eq(paymentPendingAllocations.paymentId, paymentId))
      .orderBy(desc(paymentPendingAllocations.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending allocations by status.
   */
  async getByStatus(status: TAllocationStatus): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(eq(paymentPendingAllocations.status, status))
      .orderBy(desc(paymentPendingAllocations.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves all pending (unresolved) allocations.
   */
  async getPendingAllocations(): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(eq(paymentPendingAllocations.status, 'pending'))
      .orderBy(desc(paymentPendingAllocations.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves allocations that were allocated to a specific quota.
   */
  async getByAllocatedQuotaId(quotaId: string): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(eq(paymentPendingAllocations.allocatedToQuotaId, quotaId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves allocations resolved by a specific user.
   */
  async getByAllocatedBy(userId: string): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(eq(paymentPendingAllocations.allocatedBy, userId))
      .orderBy(desc(paymentPendingAllocations.allocatedAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending allocations for a payment that are still unresolved.
   */
  async getPendingByPaymentId(paymentId: string): Promise<TPaymentPendingAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentPendingAllocations)
      .where(
        and(
          eq(paymentPendingAllocations.paymentId, paymentId),
          eq(paymentPendingAllocations.status, 'pending')
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Checks if a payment has any pending allocations.
   */
  async hasPendingAllocations(paymentId: string): Promise<boolean> {
    const results = await this.db
      .select({ id: paymentPendingAllocations.id })
      .from(paymentPendingAllocations)
      .where(
        and(
          eq(paymentPendingAllocations.paymentId, paymentId),
          eq(paymentPendingAllocations.status, 'pending')
        )
      )
      .limit(1)

    return results.length > 0
  }

  /**
   * Deletes an allocation record (hard delete).
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }
}
