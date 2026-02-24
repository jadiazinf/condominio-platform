import { eq, and, sql } from 'drizzle-orm'
import type { TPaymentConceptService } from '@packages/domain'
import { paymentConceptServices, condominiumServices } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TPaymentConceptServiceRecord = typeof paymentConceptServices.$inferSelect

type TPaymentConceptServiceCreate = {
  paymentConceptId: string
  serviceId: string
  amount: number
  useDefaultAmount?: boolean
}

export class PaymentConceptServicesRepository
  extends BaseRepository<typeof paymentConceptServices, TPaymentConceptService, TPaymentConceptServiceCreate, Partial<TPaymentConceptServiceCreate>>
{
  constructor(db: TDrizzleClient) {
    super(db, paymentConceptServices)
  }

  protected mapToEntity(record: unknown): TPaymentConceptService {
    const r = record as TPaymentConceptServiceRecord
    return {
      id: r.id,
      paymentConceptId: r.paymentConceptId,
      serviceId: r.serviceId,
      amount: Number(r.amount),
      useDefaultAmount: r.useDefaultAmount ?? true,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TPaymentConceptServiceCreate): Record<string, unknown> {
    return {
      paymentConceptId: dto.paymentConceptId,
      serviceId: dto.serviceId,
      amount: String(dto.amount),
      useDefaultAmount: dto.useDefaultAmount ?? true,
    }
  }

  protected mapToUpdateValues(dto: Partial<TPaymentConceptServiceCreate>): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.amount !== undefined) values.amount = String(dto.amount)
    if (dto.useDefaultAmount !== undefined) values.useDefaultAmount = dto.useDefaultAmount
    values.updatedAt = new Date()
    return values
  }

  /**
   * List all services linked to a payment concept (with service details).
   */
  async listByConceptId(conceptId: string): Promise<(TPaymentConceptService & { serviceName: string; providerType: string })[]> {
    const results = await this.db
      .select({
        id: paymentConceptServices.id,
        paymentConceptId: paymentConceptServices.paymentConceptId,
        serviceId: paymentConceptServices.serviceId,
        amount: paymentConceptServices.amount,
        useDefaultAmount: paymentConceptServices.useDefaultAmount,
        createdAt: paymentConceptServices.createdAt,
        updatedAt: paymentConceptServices.updatedAt,
        serviceName: condominiumServices.name,
        providerType: condominiumServices.providerType,
      })
      .from(paymentConceptServices)
      .innerJoin(condominiumServices, eq(paymentConceptServices.serviceId, condominiumServices.id))
      .where(eq(paymentConceptServices.paymentConceptId, conceptId))

    return results.map(r => ({
      id: r.id,
      paymentConceptId: r.paymentConceptId,
      serviceId: r.serviceId,
      amount: Number(r.amount),
      useDefaultAmount: r.useDefaultAmount ?? true,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
      serviceName: r.serviceName,
      providerType: r.providerType,
    }))
  }

  /**
   * Link a service to a payment concept.
   */
  async linkService(
    paymentConceptId: string,
    serviceId: string,
    amount: number,
    useDefaultAmount = true
  ): Promise<TPaymentConceptService> {
    const results = await this.db
      .insert(paymentConceptServices)
      .values({
        paymentConceptId,
        serviceId,
        amount: String(amount),
        useDefaultAmount,
      })
      .returning()

    return this.mapToEntity(results[0])
  }

  /**
   * Unlink a service from a payment concept.
   */
  async unlinkService(paymentConceptId: string, serviceId: string): Promise<boolean> {
    const results = await this.db
      .delete(paymentConceptServices)
      .where(
        and(
          eq(paymentConceptServices.paymentConceptId, paymentConceptId),
          eq(paymentConceptServices.serviceId, serviceId)
        )
      )
      .returning()

    return results.length > 0
  }

  /**
   * Unlink by link ID.
   */
  async unlinkById(linkId: string): Promise<boolean> {
    const results = await this.db
      .delete(paymentConceptServices)
      .where(eq(paymentConceptServices.id, linkId))
      .returning()

    return results.length > 0
  }

  /**
   * Get the total amount of all services linked to a concept.
   */
  async getTotalAmount(conceptId: string): Promise<number> {
    const result = await this.db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(paymentConceptServices)
      .where(eq(paymentConceptServices.paymentConceptId, conceptId))

    return Number(result[0]?.total ?? 0)
  }
}
