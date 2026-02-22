import { eq, and } from 'drizzle-orm'
import type { TPaymentConceptBankAccount } from '@packages/domain'
import { paymentConceptBankAccounts } from '@database/drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TRecord = typeof paymentConceptBankAccounts.$inferSelect

export class PaymentConceptBankAccountsRepository {
  constructor(protected readonly db: TDrizzleClient) {}

  private mapToEntity(record: TRecord): TPaymentConceptBankAccount {
    return {
      id: record.id,
      paymentConceptId: record.paymentConceptId,
      bankAccountId: record.bankAccountId,
      assignedBy: record.assignedBy,
      createdAt: record.createdAt ?? new Date(),
    }
  }

  async listByConceptId(conceptId: string): Promise<TPaymentConceptBankAccount[]> {
    const results = await this.db
      .select()
      .from(paymentConceptBankAccounts)
      .where(eq(paymentConceptBankAccounts.paymentConceptId, conceptId))

    return results.map(r => this.mapToEntity(r))
  }

  async linkBankAccount(
    conceptId: string,
    bankAccountId: string,
    assignedBy: string | null
  ): Promise<TPaymentConceptBankAccount> {
    const [result] = await this.db
      .insert(paymentConceptBankAccounts)
      .values({
        paymentConceptId: conceptId,
        bankAccountId,
        assignedBy,
      })
      .returning()

    return this.mapToEntity(result!)
  }

  async unlinkBankAccount(conceptId: string, bankAccountId: string): Promise<boolean> {
    const result = await this.db
      .delete(paymentConceptBankAccounts)
      .where(
        and(
          eq(paymentConceptBankAccounts.paymentConceptId, conceptId),
          eq(paymentConceptBankAccounts.bankAccountId, bankAccountId)
        )
      )
      .returning()

    return result.length > 0
  }

  async getLink(
    conceptId: string,
    bankAccountId: string
  ): Promise<TPaymentConceptBankAccount | null> {
    const results = await this.db
      .select()
      .from(paymentConceptBankAccounts)
      .where(
        and(
          eq(paymentConceptBankAccounts.paymentConceptId, conceptId),
          eq(paymentConceptBankAccounts.bankAccountId, bankAccountId)
        )
      )
      .limit(1)

    return results.length > 0 ? this.mapToEntity(results[0]!) : null
  }
}
