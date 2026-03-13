import { eq } from 'drizzle-orm'
import type {
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate,
} from '@packages/domain'
import { paymentApplications } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TPaymentApplicationRecord = typeof paymentApplications.$inferSelect

/**
 * Repository for managing payment application entities.
 * Uses hard delete since this is a junction table.
 */
export class PaymentApplicationsRepository
  extends BaseRepository<
    typeof paymentApplications,
    TPaymentApplication,
    TPaymentApplicationCreate,
    TPaymentApplicationUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TPaymentApplication,
      TPaymentApplicationCreate,
      TPaymentApplicationUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, paymentApplications)
  }

  protected mapToEntity(record: unknown): TPaymentApplication {
    const r = record as TPaymentApplicationRecord
    return {
      id: r.id,
      paymentId: r.paymentId,
      quotaId: r.quotaId,
      appliedAmount: r.appliedAmount,
      appliedToPrincipal: r.appliedToPrincipal ?? '0',
      appliedToInterest: r.appliedToInterest ?? '0',
      registeredBy: r.registeredBy,
      appliedAt: r.appliedAt ?? new Date(),
    }
  }

  /**
   * Override listAll since payment applications don't have isActive.
   */
  override async listAll(): Promise<TPaymentApplication[]> {
    const results = await this.db.select().from(paymentApplications)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves applications by payment.
   */
  async getByPaymentId(paymentId: string): Promise<TPaymentApplication[]> {
    const results = await this.db
      .select()
      .from(paymentApplications)
      .where(eq(paymentApplications.paymentId, paymentId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves applications by quota.
   */
  async getByQuotaId(quotaId: string): Promise<TPaymentApplication[]> {
    const results = await this.db
      .select()
      .from(paymentApplications)
      .where(eq(paymentApplications.quotaId, quotaId))

    return results.map(record => this.mapToEntity(record))
  }
}
