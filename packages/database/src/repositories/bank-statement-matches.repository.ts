import { eq, inArray } from 'drizzle-orm'
import type { TBankStatementMatch, TBankStatementMatchCreate } from '@packages/domain'
import { bankStatementMatches } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRecord = typeof bankStatementMatches.$inferSelect

export class BankStatementMatchesRepository
  extends BaseRepository<
    typeof bankStatementMatches,
    TBankStatementMatch,
    TBankStatementMatchCreate,
    Partial<TBankStatementMatchCreate>
  >
  implements
    IRepositoryWithHardDelete<
      TBankStatementMatch,
      TBankStatementMatchCreate,
      Partial<TBankStatementMatchCreate>
    >
{
  constructor(db: TDrizzleClient) {
    super(db, bankStatementMatches)
  }

  protected mapToEntity(record: unknown): TBankStatementMatch {
    const r = record as TRecord
    return {
      id: r.id,
      entryId: r.entryId,
      paymentId: r.paymentId,
      matchType: r.matchType as TBankStatementMatch['matchType'],
      confidence: r.confidence,
      matchedBy: r.matchedBy,
      notes: r.notes,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByEntryId(entryId: string): Promise<TBankStatementMatch | null> {
    const results = await this.db
      .select()
      .from(bankStatementMatches)
      .where(eq(bankStatementMatches.entryId, entryId))
      .limit(1)
    return results[0] ? this.mapToEntity(results[0]) : null
  }

  async getByPaymentId(paymentId: string): Promise<TBankStatementMatch[]> {
    const results = await this.db
      .select()
      .from(bankStatementMatches)
      .where(eq(bankStatementMatches.paymentId, paymentId))
    return results.map(r => this.mapToEntity(r))
  }

  async getByEntryIds(entryIds: string[]): Promise<TBankStatementMatch[]> {
    if (entryIds.length === 0) return []
    const results = await this.db
      .select()
      .from(bankStatementMatches)
      .where(inArray(bankStatementMatches.entryId, entryIds))
    return results.map(r => this.mapToEntity(r))
  }

  async deleteByEntryId(entryId: string): Promise<boolean> {
    const results = await this.db
      .delete(bankStatementMatches)
      .where(eq(bankStatementMatches.entryId, entryId))
      .returning()
    return (results as unknown[]).length > 0
  }
}
