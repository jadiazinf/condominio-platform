import { eq } from 'drizzle-orm'
import { billingChannelBankAccounts } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TRecord = typeof billingChannelBankAccounts.$inferSelect
type TEntity = {
  id: string
  billingChannelId: string
  bankAccountId: string
  isActive: boolean
  assignedBy: string | null
  createdAt: Date
}
type TCreate = Omit<TEntity, 'id' | 'createdAt'>

export class BillingChannelBankAccountsRepository extends BaseRepository<
  typeof billingChannelBankAccounts,
  TEntity,
  TCreate,
  Partial<TCreate>
> {
  constructor(db: TDrizzleClient) {
    super(db, billingChannelBankAccounts)
  }

  protected mapToEntity(record: unknown): TEntity {
    const r = record as TRecord
    return {
      id: r.id,
      billingChannelId: r.billingChannelId,
      bankAccountId: r.bankAccountId,
      isActive: r.isActive ?? true,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  async listByChannel(channelId: string): Promise<TEntity[]> {
    const results = await this.db
      .select()
      .from(billingChannelBankAccounts)
      .where(eq(billingChannelBankAccounts.billingChannelId, channelId))

    return results.map(r => this.mapToEntity(r))
  }
}
