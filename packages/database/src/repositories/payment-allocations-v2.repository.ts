import { eq } from 'drizzle-orm'
import type { TPaymentAllocation } from '@packages/domain'
import { paymentAllocations } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TRecord = typeof paymentAllocations.$inferSelect
type TCreate = Omit<TPaymentAllocation, 'id' | 'allocatedAt'>

export class PaymentAllocationsV2Repository {
  protected readonly db: TDrizzleClient

  constructor(db: TDrizzleClient) {
    this.db = db
  }

  private mapToEntity(record: unknown): TPaymentAllocation {
    const r = record as TRecord
    return {
      id: r.id,
      paymentId: r.paymentId,
      chargeId: r.chargeId,
      allocatedAmount: r.allocatedAmount,
      allocatedAt: r.allocatedAt ?? new Date(),
      reversed: r.reversed ?? false,
      reversedAt: r.reversedAt,
      createdBy: r.createdBy,
    }
  }

  async create(data: TCreate): Promise<TPaymentAllocation> {
    const results = await this.db
      .insert(paymentAllocations)
      .values(data)
      .returning()

    return this.mapToEntity(results[0])
  }

  async findByPayment(paymentId: string): Promise<TPaymentAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId))

    return results.map(r => this.mapToEntity(r))
  }

  async findByCharge(chargeId: string): Promise<TPaymentAllocation[]> {
    const results = await this.db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.chargeId, chargeId))

    return results.map(r => this.mapToEntity(r))
  }

  async update(id: string, data: Partial<TPaymentAllocation>): Promise<TPaymentAllocation | null> {
    const results = await this.db
      .update(paymentAllocations)
      .set(data)
      .where(eq(paymentAllocations.id, id))
      .returning()

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  withTx(tx: TDrizzleClient): PaymentAllocationsV2Repository {
    const clone = Object.create(Object.getPrototypeOf(this)) as PaymentAllocationsV2Repository
    Object.assign(clone, this)
    ;(clone as any).db = tx
    return clone
  }
}
