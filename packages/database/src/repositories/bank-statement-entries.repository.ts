import { and, eq, desc, gte, lte } from 'drizzle-orm'
import type {
  TBankStatementEntry,
  TBankStatementEntryCreate,
  TBankStatementEntryUpdate,
} from '@packages/domain'
import { bankStatementEntries } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRecord = typeof bankStatementEntries.$inferSelect

export class BankStatementEntriesRepository
  extends BaseRepository<
    typeof bankStatementEntries,
    TBankStatementEntry,
    TBankStatementEntryCreate,
    TBankStatementEntryUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TBankStatementEntry,
      TBankStatementEntryCreate,
      TBankStatementEntryUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, bankStatementEntries)
  }

  protected mapToEntity(record: unknown): TBankStatementEntry {
    const r = record as TRecord
    return {
      id: r.id,
      importId: r.importId,
      transactionDate: r.transactionDate ? new Date(r.transactionDate) : new Date(),
      valueDate: r.valueDate ? new Date(r.valueDate) : null,
      reference: r.reference,
      description: r.description,
      amount: r.amount,
      entryType: r.entryType as TBankStatementEntry['entryType'],
      balance: r.balance,
      status: (r.status ?? 'unmatched') as TBankStatementEntry['status'],
      matchedAt: r.matchedAt,
      rawData: r.rawData as Record<string, unknown> | null,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByImportId(importId: string): Promise<TBankStatementEntry[]> {
    const results = await this.db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.importId, importId))
      .orderBy(desc(bankStatementEntries.transactionDate))
    return results.map(r => this.mapToEntity(r))
  }

  async getUnmatchedByImportId(importId: string): Promise<TBankStatementEntry[]> {
    const results = await this.db
      .select()
      .from(bankStatementEntries)
      .where(
        and(
          eq(bankStatementEntries.importId, importId),
          eq(bankStatementEntries.status, 'unmatched')
        )
      )
      .orderBy(desc(bankStatementEntries.transactionDate))
    return results.map(r => this.mapToEntity(r))
  }

  async getCreditsByImportId(importId: string): Promise<TBankStatementEntry[]> {
    const results = await this.db
      .select()
      .from(bankStatementEntries)
      .where(
        and(
          eq(bankStatementEntries.importId, importId),
          eq(bankStatementEntries.entryType, 'credit')
        )
      )
      .orderBy(desc(bankStatementEntries.transactionDate))
    return results.map(r => this.mapToEntity(r))
  }

  async getByDateRange(importId: string, from: string, to: string): Promise<TBankStatementEntry[]> {
    const results = await this.db
      .select()
      .from(bankStatementEntries)
      .where(
        and(
          eq(bankStatementEntries.importId, importId),
          gte(bankStatementEntries.transactionDate, from),
          lte(bankStatementEntries.transactionDate, to)
        )
      )
      .orderBy(desc(bankStatementEntries.transactionDate))
    return results.map(r => this.mapToEntity(r))
  }

  async updateStatus(
    id: string,
    status: TBankStatementEntry['status'],
    matchedAt?: Date | null
  ): Promise<TBankStatementEntry | null> {
    const results = await this.db
      .update(bankStatementEntries)
      .set({
        status,
        matchedAt: matchedAt ?? (status === 'matched' ? new Date() : null),
        updatedAt: new Date(),
      })
      .where(eq(bankStatementEntries.id, id))
      .returning()
    return results[0] ? this.mapToEntity(results[0]) : null
  }
}
