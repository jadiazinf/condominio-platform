import { and, eq, inArray } from 'drizzle-orm'
import type {
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate,
} from '@packages/domain'
import { paymentApplications, quotas, paymentConcepts } from '../drizzle/schema'
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
   * Retrieves applications scoped to a condominium via quota → paymentConcept → condominium.
   */
  async listByCondominiumId(condominiumId: string): Promise<TPaymentApplication[]> {
    const condominiumQuotaIds = this.db
      .select({ id: quotas.id })
      .from(quotas)
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(eq(paymentConcepts.condominiumId, condominiumId))

    const results = await this.db
      .select()
      .from(paymentApplications)
      .where(inArray(paymentApplications.quotaId, condominiumQuotaIds))

    return results.map(record => this.mapToEntity(record))
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
  async getByPaymentId(paymentId: string, condominiumId?: string): Promise<TPaymentApplication[]> {
    const conditions = [eq(paymentApplications.paymentId, paymentId)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))

      conditions.push(inArray(paymentApplications.quotaId, condominiumQuotaIds))
    }

    const results = await this.db
      .select()
      .from(paymentApplications)
      .where(and(...conditions))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves applications by payment with quota and concept details.
   */
  async getByPaymentIdWithRelations(
    paymentId: string,
    condominiumId?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    const conditions = [eq(paymentApplications.paymentId, paymentId)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(paymentApplications.quotaId, condominiumQuotaIds))
    }

    const results = await this.db
      .select({
        application: paymentApplications,
        periodYear: quotas.periodYear,
        periodMonth: quotas.periodMonth,
        periodDescription: quotas.periodDescription,
        balance: quotas.balance,
        dueDate: quotas.dueDate,
        conceptName: paymentConcepts.name,
      })
      .from(paymentApplications)
      .leftJoin(quotas, eq(paymentApplications.quotaId, quotas.id))
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(and(...conditions))

    return results.map(r => ({
      ...this.mapToEntity(r.application),
      quota: r.periodYear
        ? {
            periodYear: r.periodYear,
            periodMonth: r.periodMonth!,
            periodDescription: r.periodDescription,
            balance: r.balance!,
            dueDate: r.dueDate!,
          }
        : undefined,
      conceptName: r.conceptName ?? undefined,
    }))
  }

  /**
   * Retrieves applications for multiple payments with quota and concept details.
   */
  async getByPaymentIdsWithRelations(
    paymentIds: string[],
    condominiumId?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    if (paymentIds.length === 0) return []

    const conditions = [inArray(paymentApplications.paymentId, paymentIds)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(paymentApplications.quotaId, condominiumQuotaIds))
    }

    const results = await this.db
      .select({
        application: paymentApplications,
        periodYear: quotas.periodYear,
        periodMonth: quotas.periodMonth,
        conceptName: paymentConcepts.name,
      })
      .from(paymentApplications)
      .leftJoin(quotas, eq(paymentApplications.quotaId, quotas.id))
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(and(...conditions))

    return results.map(r => ({
      paymentId: r.application.paymentId,
      quotaId: r.application.quotaId,
      appliedAmount: r.application.appliedAmount,
      conceptName: r.conceptName ?? undefined,
      periodYear: r.periodYear ?? undefined,
      periodMonth: r.periodMonth ?? undefined,
    }))
  }

  /**
   * Retrieves applications by quota.
   */
  async getByQuotaId(quotaId: string, condominiumId?: string): Promise<TPaymentApplication[]> {
    const conditions = [eq(paymentApplications.quotaId, quotaId)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))

      conditions.push(inArray(paymentApplications.quotaId, condominiumQuotaIds))
    }

    const results = await this.db
      .select()
      .from(paymentApplications)
      .where(and(...conditions))

    return results.map(record => this.mapToEntity(record))
  }
}
