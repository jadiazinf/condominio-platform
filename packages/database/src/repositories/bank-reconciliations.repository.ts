import { and, eq, desc } from 'drizzle-orm'
import type {
  TBankReconciliation,
  TBankReconciliationCreate,
  TBankReconciliationUpdate,
} from '@packages/domain'
import { bankReconciliations } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRecord = typeof bankReconciliations.$inferSelect

export class BankReconciliationsRepository
  extends BaseRepository<
    typeof bankReconciliations,
    TBankReconciliation,
    TBankReconciliationCreate,
    TBankReconciliationUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TBankReconciliation,
      TBankReconciliationCreate,
      TBankReconciliationUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, bankReconciliations)
  }

  protected mapToEntity(record: unknown): TBankReconciliation {
    const r = record as TRecord
    return {
      id: r.id,
      bankAccountId: r.bankAccountId,
      condominiumId: r.condominiumId,
      periodFrom: r.periodFrom ? new Date(r.periodFrom) : new Date(),
      periodTo: r.periodTo ? new Date(r.periodTo) : new Date(),
      status: (r.status ?? 'in_progress') as TBankReconciliation['status'],
      totalMatched: r.totalMatched ?? 0,
      totalUnmatched: r.totalUnmatched ?? 0,
      totalIgnored: r.totalIgnored ?? 0,
      reconciledBy: r.reconciledBy,
      reconciledAt: r.reconciledAt,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async listAll(): Promise<TBankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .orderBy(desc(bankReconciliations.createdAt))
    return results.map(r => this.mapToEntity(r))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByBankAccountId(bankAccountId: string): Promise<TBankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.bankAccountId, bankAccountId))
      .orderBy(desc(bankReconciliations.createdAt))
    return results.map(r => this.mapToEntity(r))
  }

  async getByCondominiumId(condominiumId: string): Promise<TBankReconciliation[]> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.condominiumId, condominiumId))
      .orderBy(desc(bankReconciliations.createdAt))
    return results.map(r => this.mapToEntity(r))
  }

  async getInProgress(bankAccountId: string): Promise<TBankReconciliation | null> {
    const results = await this.db
      .select()
      .from(bankReconciliations)
      .where(
        and(
          eq(bankReconciliations.bankAccountId, bankAccountId),
          eq(bankReconciliations.status, 'in_progress')
        )
      )
      .limit(1)
    return results[0] ? this.mapToEntity(results[0]) : null
  }
}
