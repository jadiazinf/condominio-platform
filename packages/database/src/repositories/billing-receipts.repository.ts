import { eq, and, ne, desc, sql } from 'drizzle-orm'
import type { TBillingReceipt } from '@packages/domain'
import { receipts } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'
import { BaseRepository } from './base'

type TReceiptRecord = typeof receipts.$inferSelect
type TReceiptCreate = Omit<TBillingReceipt, 'id' | 'createdAt' | 'updatedAt'>
type TReceiptUpdate = Partial<TReceiptCreate>

export class BillingReceiptsRepository extends BaseRepository<
  typeof receipts,
  TBillingReceipt,
  TReceiptCreate,
  TReceiptUpdate
> {
  constructor(db: TDrizzleClient) {
    super(db, receipts)
  }

  protected mapToEntity(record: unknown): TBillingReceipt {
    const r = record as TReceiptRecord
    return {
      id: r.id,
      billingChannelId: r.billingChannelId,
      unitId: r.unitId,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      receiptNumber: r.receiptNumber,
      status: r.status,
      issuedAt: r.issuedAt,
      dueDate: r.dueDate,
      subtotal: r.subtotal ?? '0',
      reserveFundAmount: r.reserveFundAmount ?? '0',
      previousBalance: r.previousBalance ?? '0',
      interestAmount: r.interestAmount ?? '0',
      lateFeeAmount: r.lateFeeAmount ?? '0',
      discountAmount: r.discountAmount ?? '0',
      totalAmount: r.totalAmount,
      currencyId: r.currencyId,
      replacesReceiptId: r.replacesReceiptId,
      voidReason: r.voidReason,
      budgetId: r.budgetId,
      pdfUrl: r.pdfUrl,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async findActiveByChannelAndPeriod(
    channelId: string,
    periodYear: number,
    periodMonth: number
  ): Promise<TBillingReceipt[]> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.billingChannelId, channelId),
          eq(receipts.periodYear, periodYear),
          eq(receipts.periodMonth, periodMonth),
          ne(receipts.status, 'voided')
        )
      )

    return results.map(r => this.mapToEntity(r))
  }

  async findByUnitAndChannel(unitId: string, channelId: string): Promise<TBillingReceipt[]> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(and(eq(receipts.unitId, unitId), eq(receipts.billingChannelId, channelId)))
      .orderBy(desc(receipts.periodYear), desc(receipts.periodMonth))

    return results.map(r => this.mapToEntity(r))
  }

  async findLastByCondominium(condominiumId: string): Promise<TBillingReceipt | null> {
    // Join with billing_channels to filter by condominium
    const result = await this.db
      .select({ receipt: receipts })
      .from(receipts)
      .innerJoin(
        sql`billing_channels`,
        sql`billing_channels.id = ${receipts.billingChannelId}`
      )
      .where(sql`billing_channels.condominium_id = ${condominiumId}`)
      .orderBy(desc(receipts.receiptNumber))
      .limit(1)

    return result[0] ? this.mapToEntity(result[0].receipt) : null
  }

  async findByReceiptNumber(receiptNumber: string): Promise<TBillingReceipt | null> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.receiptNumber, receiptNumber))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
  }
}
