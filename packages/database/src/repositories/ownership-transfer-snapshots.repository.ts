import { eq, desc } from 'drizzle-orm'
import type { TOwnershipTransferSnapshot } from '@packages/domain'
import { ownershipTransferSnapshots } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TRecord = typeof ownershipTransferSnapshots.$inferSelect
type TCreate = Omit<TOwnershipTransferSnapshot, 'id' | 'createdAt'>

export class OwnershipTransferSnapshotsRepository {
  protected readonly db: TDrizzleClient

  constructor(db: TDrizzleClient) {
    this.db = db
  }

  private mapToEntity(record: unknown): TOwnershipTransferSnapshot {
    const r = record as TRecord
    return {
      id: r.id,
      unitId: r.unitId,
      previousOwnerId: r.previousOwnerId,
      newOwnerId: r.newOwnerId,
      transferDate: r.transferDate,
      balanceSnapshot: r.balanceSnapshot as Record<string, unknown>,
      totalDebt: r.totalDebt ?? '0',
      debtCurrencyId: r.debtCurrencyId,
      notes: r.notes,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  async create(data: TCreate): Promise<TOwnershipTransferSnapshot> {
    const results = await this.db
      .insert(ownershipTransferSnapshots)
      .values(data)
      .returning()

    return this.mapToEntity(results[0])
  }

  async findByUnit(unitId: string): Promise<TOwnershipTransferSnapshot[]> {
    const results = await this.db
      .select()
      .from(ownershipTransferSnapshots)
      .where(eq(ownershipTransferSnapshots.unitId, unitId))
      .orderBy(desc(ownershipTransferSnapshots.transferDate))

    return results.map(r => this.mapToEntity(r))
  }

  withTx(tx: TDrizzleClient): OwnershipTransferSnapshotsRepository {
    const clone = Object.create(
      Object.getPrototypeOf(this)
    ) as OwnershipTransferSnapshotsRepository
    Object.assign(clone, this)
    ;(clone as any).db = tx
    return clone
  }
}
