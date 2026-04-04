import { eq, and, asc, desc, lt, sql, between } from 'drizzle-orm'
import type { TUnitLedgerEntry } from '@packages/domain'
import { unitLedgerEntries } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TLedgerRecord = typeof unitLedgerEntries.$inferSelect
type TLedgerCreate = Omit<TUnitLedgerEntry, 'id' | 'createdAt'>

export class UnitLedgerRepository {
  protected readonly db: TDrizzleClient

  constructor(db: TDrizzleClient) {
    this.db = db
  }

  private mapToEntity(record: unknown): TUnitLedgerEntry {
    const r = record as TLedgerRecord
    return {
      id: r.id,
      unitId: r.unitId,
      condominiumId: r.condominiumId,
      entryDate: r.entryDate,
      entryType: r.entryType,
      amount: r.amount,
      currencyId: r.currencyId,
      runningBalance: r.runningBalance,
      description: r.description,
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      paymentAmount: r.paymentAmount,
      paymentCurrencyId: r.paymentCurrencyId,
      exchangeRateId: r.exchangeRateId,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  async appendEntry(data: TLedgerCreate): Promise<TUnitLedgerEntry> {
    const results = await this.db
      .insert(unitLedgerEntries)
      .values(data)
      .returning()

    return this.mapToEntity(results[0])
  }

  async getLastEntry(unitId: string, condominiumId: string): Promise<TUnitLedgerEntry | null> {
    const results = await this.db
      .select()
      .from(unitLedgerEntries)
      .where(
        and(
          eq(unitLedgerEntries.unitId, unitId),
          eq(unitLedgerEntries.condominiumId, condominiumId)
        )
      )
      .orderBy(desc(unitLedgerEntries.createdAt))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  async getLastEntryBefore(
    unitId: string,
    condominiumId: string,
    beforeDate: string
  ): Promise<TUnitLedgerEntry | null> {
    const results = await this.db
      .select()
      .from(unitLedgerEntries)
      .where(
        and(
          eq(unitLedgerEntries.unitId, unitId),
          eq(unitLedgerEntries.condominiumId, condominiumId),
          lt(unitLedgerEntries.entryDate, beforeDate)
        )
      )
      .orderBy(desc(unitLedgerEntries.createdAt))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }

  async getEntries(
    unitId: string,
    condominiumId: string,
    fromDate: string,
    toDate: string
  ): Promise<TUnitLedgerEntry[]> {
    const results = await this.db
      .select()
      .from(unitLedgerEntries)
      .where(
        and(
          eq(unitLedgerEntries.unitId, unitId),
          eq(unitLedgerEntries.condominiumId, condominiumId),
          between(unitLedgerEntries.entryDate, fromDate, toDate)
        )
      )
      .orderBy(asc(unitLedgerEntries.entryDate), asc(unitLedgerEntries.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  async getBalance(unitId: string, condominiumId: string): Promise<string> {
    const lastEntry = await this.getLastEntry(unitId, condominiumId)
    return lastEntry?.runningBalance ?? '0'
  }

  withTx(tx: TDrizzleClient): UnitLedgerRepository {
    const clone = Object.create(Object.getPrototypeOf(this)) as UnitLedgerRepository
    Object.assign(clone, this)
    ;(clone as any).db = tx
    return clone
  }
}
