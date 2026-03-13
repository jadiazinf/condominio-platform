import { eq, desc } from 'drizzle-orm'
import type { TPaymentConceptChange } from '@packages/domain'
import { paymentConceptChanges } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TRecord = typeof paymentConceptChanges.$inferSelect

export class PaymentConceptChangesRepository {
  constructor(protected readonly db: TDrizzleClient) {}

  withTx(tx: TDrizzleClient): PaymentConceptChangesRepository {
    return new PaymentConceptChangesRepository(tx)
  }

  private mapToEntity(record: TRecord): TPaymentConceptChange {
    return {
      id: record.id,
      paymentConceptId: record.paymentConceptId,
      condominiumId: record.condominiumId,
      changedBy: record.changedBy,
      previousValues: (record.previousValues ?? {}) as Record<string, unknown>,
      newValues: (record.newValues ?? {}) as Record<string, unknown>,
      notes: record.notes,
      createdAt: record.createdAt ?? new Date(),
    }
  }

  async create(data: {
    paymentConceptId: string
    condominiumId: string
    changedBy: string
    previousValues: Record<string, unknown>
    newValues: Record<string, unknown>
    notes?: string | null
  }): Promise<TPaymentConceptChange> {
    const [result] = await this.db
      .insert(paymentConceptChanges)
      .values({
        paymentConceptId: data.paymentConceptId,
        condominiumId: data.condominiumId,
        changedBy: data.changedBy,
        previousValues: data.previousValues,
        newValues: data.newValues,
        notes: data.notes ?? null,
      })
      .returning()

    return this.mapToEntity(result!)
  }

  async listByConceptId(conceptId: string): Promise<TPaymentConceptChange[]> {
    const results = await this.db
      .select()
      .from(paymentConceptChanges)
      .where(eq(paymentConceptChanges.paymentConceptId, conceptId))
      .orderBy(desc(paymentConceptChanges.createdAt))

    return results.map(r => this.mapToEntity(r))
  }
}
