import { eq, and, ne, desc } from 'drizzle-orm'
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
      condominiumId: r.condominiumId,
      unitId: r.unitId,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      receiptNumber: r.receiptNumber,
      status: r.status,
      receiptType: r.receiptType,
      issuedAt: r.issuedAt,
      dueDate: r.dueDate,
      parentReceiptId: r.parentReceiptId,
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
      assemblyMinuteId: r.assemblyMinuteId,
      budgetId: r.budgetId,
      pdfUrl: r.pdfUrl,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      generatedBy: r.generatedBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  async findActiveByCondominiumAndPeriod(
    condominiumId: string,
    periodYear: number,
    periodMonth: number
  ): Promise<TBillingReceipt[]> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.condominiumId, condominiumId),
          eq(receipts.periodYear, periodYear),
          eq(receipts.periodMonth, periodMonth),
          ne(receipts.status, 'voided')
        )
      )

    return results.map(r => this.mapToEntity(r))
  }

  async findByUnitAndCondominium(unitId: string, condominiumId: string): Promise<TBillingReceipt[]> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(and(eq(receipts.unitId, unitId), eq(receipts.condominiumId, condominiumId)))
      .orderBy(desc(receipts.periodYear), desc(receipts.periodMonth))

    return results.map(r => this.mapToEntity(r))
  }

  async findLastByCondominium(condominiumId: string): Promise<TBillingReceipt | null> {
    const results = await this.db
      .select()
      .from(receipts)
      .where(eq(receipts.condominiumId, condominiumId))
      .orderBy(desc(receipts.receiptNumber))
      .limit(1)

    return results[0] ? this.mapToEntity(results[0]) : null
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
