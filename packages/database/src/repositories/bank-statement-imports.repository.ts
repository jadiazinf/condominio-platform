import { and, eq, desc, gte, lte } from 'drizzle-orm'
import type {
  TBankStatementImport,
  TBankStatementImportCreate,
  TBankStatementImportUpdate,
} from '@packages/domain'
import { bankStatementImports } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TRecord = typeof bankStatementImports.$inferSelect

export class BankStatementImportsRepository
  extends BaseRepository<
    typeof bankStatementImports,
    TBankStatementImport,
    TBankStatementImportCreate,
    TBankStatementImportUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TBankStatementImport,
      TBankStatementImportCreate,
      TBankStatementImportUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, bankStatementImports)
  }

  protected mapToEntity(record: unknown): TBankStatementImport {
    const r = record as TRecord
    return {
      id: r.id,
      bankAccountId: r.bankAccountId,
      filename: r.filename,
      importedBy: r.importedBy,
      periodFrom: r.periodFrom ? new Date(r.periodFrom) : new Date(),
      periodTo: r.periodTo ? new Date(r.periodTo) : new Date(),
      totalEntries: r.totalEntries ?? 0,
      totalCredits: r.totalCredits ?? '0',
      totalDebits: r.totalDebits ?? '0',
      status: (r.status ?? 'processing') as TBankStatementImport['status'],
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  override async listAll(): Promise<TBankStatementImport[]> {
    const results = await this.db
      .select()
      .from(bankStatementImports)
      .orderBy(desc(bankStatementImports.createdAt))
    return results.map(r => this.mapToEntity(r))
  }

  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  async getByBankAccountId(bankAccountId: string): Promise<TBankStatementImport[]> {
    const results = await this.db
      .select()
      .from(bankStatementImports)
      .where(eq(bankStatementImports.bankAccountId, bankAccountId))
      .orderBy(desc(bankStatementImports.createdAt))
    return results.map(r => this.mapToEntity(r))
  }

  async getByBankAccountAndPeriod(
    bankAccountId: string,
    from: string,
    to: string
  ): Promise<TBankStatementImport[]> {
    const results = await this.db
      .select()
      .from(bankStatementImports)
      .where(
        and(
          eq(bankStatementImports.bankAccountId, bankAccountId),
          gte(bankStatementImports.periodFrom, from),
          lte(bankStatementImports.periodTo, to)
        )
      )
      .orderBy(desc(bankStatementImports.createdAt))
    return results.map(r => this.mapToEntity(r))
  }
}
