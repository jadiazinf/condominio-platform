import { eq, and, or, ilike, sql, desc, inArray, type SQL } from 'drizzle-orm'
import type {
  TBankAccount,
  TBankAccountCreate,
  TPaginatedResponse,
  TBankAccountsQuerySchema,
} from '@packages/domain'
import { bankAccounts, bankAccountCondominiums, users } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TBankAccountRecord = typeof bankAccounts.$inferSelect

export class BankAccountsRepository
  extends BaseRepository<typeof bankAccounts, TBankAccount, TBankAccountCreate, Partial<TBankAccountCreate>>
  implements IRepository<TBankAccount, TBankAccountCreate, Partial<TBankAccountCreate>>
{
  constructor(db: TDrizzleClient) {
    super(db, bankAccounts)
  }

  protected mapToEntity(record: unknown): TBankAccount {
    const r = record as TBankAccountRecord
    return {
      id: r.id,
      managementCompanyId: r.managementCompanyId,
      bankId: r.bankId,
      accountCategory: r.accountCategory as 'national' | 'international',
      displayName: r.displayName,
      bankName: r.bankName,
      accountHolderName: r.accountHolderName,
      currency: r.currency,
      currencyId: r.currencyId ?? null,
      accountDetails: r.accountDetails as Record<string, unknown>,
      acceptedPaymentMethods: (r.acceptedPaymentMethods ?? []) as TBankAccount['acceptedPaymentMethods'],
      appliesToAllCondominiums: r.appliesToAllCondominiums ?? false,
      isActive: r.isActive ?? true,
      notes: r.notes,
      createdBy: r.createdBy,
      deactivatedBy: r.deactivatedBy,
      deactivatedAt: r.deactivatedAt,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TBankAccountCreate): Record<string, unknown> {
    return {
      managementCompanyId: (dto as Record<string, unknown>).managementCompanyId,
      bankId: dto.bankId,
      accountCategory: dto.accountCategory,
      displayName: dto.displayName,
      bankName: dto.bankName,
      accountHolderName: dto.accountHolderName,
      currency: dto.currency,
      currencyId: (dto as Record<string, unknown>).currencyId,
      accountDetails: dto.accountDetails,
      acceptedPaymentMethods: dto.acceptedPaymentMethods,
      appliesToAllCondominiums: dto.appliesToAllCondominiums,
      notes: dto.notes,
      createdBy: (dto as Record<string, unknown>).createdBy,
    }
  }

  protected mapToUpdateValues(dto: Partial<TBankAccountCreate>): Record<string, unknown> {
    const values: Record<string, unknown> = {}
    if (dto.displayName !== undefined) values.displayName = dto.displayName
    if (dto.bankName !== undefined) values.bankName = dto.bankName
    return values
  }

  /**
   * List bank accounts for a management company with pagination and filters.
   */
  async listByManagementCompanyPaginated(
    managementCompanyId: string,
    query: TBankAccountsQuerySchema
  ): Promise<TPaginatedResponse<TBankAccount>> {
    const { page = 1, limit = 20, search, accountCategory, isActive, condominiumId } = query
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(bankAccounts.managementCompanyId, managementCompanyId)]

    if (isActive !== undefined) {
      conditions.push(eq(bankAccounts.isActive, isActive))
    }

    if (accountCategory) {
      conditions.push(eq(bankAccounts.accountCategory, accountCategory))
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(bankAccounts.displayName, searchTerm),
          ilike(bankAccounts.bankName, searchTerm),
          ilike(bankAccounts.accountHolderName, searchTerm)
        )!
      )
    }

    // If filtering by condominium, we need to find accounts that either:
    // 1. Apply to all condominiums, OR
    // 2. Have a specific junction record for this condominium
    if (condominiumId) {
      const junctionIds = await this.db
        .select({ bankAccountId: bankAccountCondominiums.bankAccountId })
        .from(bankAccountCondominiums)
        .where(eq(bankAccountCondominiums.condominiumId, condominiumId))

      const bankAccountIds = junctionIds.map(j => j.bankAccountId)

      if (bankAccountIds.length > 0) {
        conditions.push(
          or(
            eq(bankAccounts.appliesToAllCondominiums, true),
            inArray(bankAccounts.id, bankAccountIds)
          )!
        )
      } else {
        conditions.push(eq(bankAccounts.appliesToAllCondominiums, true))
      }
    }

    const whereClause = and(...conditions)

    const results = await this.db
      .select()
      .from(bankAccounts)
      .where(whereClause)
      .orderBy(desc(bankAccounts.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(bankAccounts)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0
    const totalPages = Math.ceil(total / limit)

    // Fetch condominium counts for each bank account
    const bankAccountIds = results.map(r => r.id)
    let condoCounts: Map<string, number> = new Map()

    if (bankAccountIds.length > 0) {
      const counts = await this.db
        .select({
          bankAccountId: bankAccountCondominiums.bankAccountId,
          count: sql<number>`count(*)::int`,
        })
        .from(bankAccountCondominiums)
        .where(inArray(bankAccountCondominiums.bankAccountId, bankAccountIds))
        .groupBy(bankAccountCondominiums.bankAccountId)

      condoCounts = new Map(counts.map(c => [c.bankAccountId, c.count]))
    }

    const data = results.map(record => {
      const entity = this.mapToEntity(record)
      return {
        ...entity,
        condominiumCount: entity.appliesToAllCondominiums ? -1 : (condoCounts.get(entity.id) ?? 0),
      }
    })

    return {
      data,
      pagination: { page, limit, total, totalPages },
    }
  }

  /**
   * Get a bank account by ID with its assigned condominiums and user relations.
   */
  async getByIdWithCondominiums(id: string): Promise<(TBankAccount & { condominiumIds: string[] }) | null> {
    const results = await this.db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .limit(1)

    if (results.length === 0) return null

    const entity = this.mapToEntity(results[0])

    const junctionResults = await this.db
      .select({ condominiumId: bankAccountCondominiums.condominiumId })
      .from(bankAccountCondominiums)
      .where(eq(bankAccountCondominiums.bankAccountId, id))

    // Fetch creator info
    let creator: TBankAccount['creator']
    if (entity.createdBy) {
      const creatorResults = await this.db
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, entity.createdBy))
        .limit(1)
      if (creatorResults[0]) {
        creator = creatorResults[0]
      }
    }

    // Fetch deactivator info
    let deactivator: TBankAccount['deactivator']
    if (entity.deactivatedBy) {
      const deactivatorResults = await this.db
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, entity.deactivatedBy))
        .limit(1)
      if (deactivatorResults[0]) {
        deactivator = deactivatorResults[0]
      }
    }

    return {
      ...entity,
      condominiumIds: junctionResults.map(j => j.condominiumId),
      creator,
      deactivator,
    }
  }

  /**
   * Deactivate a bank account with audit trail.
   */
  async deactivate(id: string, deactivatedBy: string): Promise<TBankAccount | null> {
    const results = await this.db
      .update(bankAccounts)
      .set({
        isActive: false,
        deactivatedBy,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Assign condominiums to a bank account (bulk insert junction records).
   */
  async assignCondominiums(
    bankAccountId: string,
    condominiumIds: string[],
    assignedBy: string
  ): Promise<void> {
    if (condominiumIds.length === 0) return

    const values = condominiumIds.map(condominiumId => ({
      bankAccountId,
      condominiumId,
      assignedBy,
      assignedAt: new Date(),
    }))

    await this.db.insert(bankAccountCondominiums).values(values)
  }

  /**
   * Remove all condominium assignments for a bank account.
   */
  async removeCondominiumAssignments(bankAccountId: string): Promise<void> {
    await this.db
      .delete(bankAccountCondominiums)
      .where(eq(bankAccountCondominiums.bankAccountId, bankAccountId))
  }
}
