import { eq, and, or, sql, desc, between } from 'drizzle-orm'
import type {
  TSubscriptionInvoice,
  TSubscriptionInvoiceCreate,
  TSubscriptionInvoiceUpdate,
  TInvoiceStatus,
} from '@packages/domain'
import { subscriptionInvoices } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TInvoiceRecord = typeof subscriptionInvoices.$inferSelect

export interface ISubscriptionInvoicesQuery {
  status?: TInvoiceStatus
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Repository for managing subscription invoice entities.
 */
export class SubscriptionInvoicesRepository
  extends BaseRepository<
    typeof subscriptionInvoices,
    TSubscriptionInvoice,
    TSubscriptionInvoiceCreate,
    TSubscriptionInvoiceUpdate
  >
  implements IRepository<TSubscriptionInvoice, TSubscriptionInvoiceCreate, TSubscriptionInvoiceUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, subscriptionInvoices)
  }

  protected mapToEntity(record: unknown): TSubscriptionInvoice {
    const r = record as TInvoiceRecord
    return {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      subscriptionId: r.subscriptionId,
      managementCompanyId: r.managementCompanyId,
      amount: Number(r.amount),
      currencyId: r.currencyId,
      taxAmount: Number(r.taxAmount ?? 0),
      totalAmount: Number(r.totalAmount),
      status: r.status,
      issueDate: r.issueDate ?? new Date(),
      dueDate: r.dueDate,
      paidDate: r.paidDate,
      paymentId: r.paymentId,
      paymentMethod: r.paymentMethod,
      billingPeriodStart: r.billingPeriodStart,
      billingPeriodEnd: r.billingPeriodEnd,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TSubscriptionInvoiceCreate): Record<string, unknown> {
    return {
      invoiceNumber: dto.invoiceNumber,
      subscriptionId: dto.subscriptionId,
      managementCompanyId: dto.managementCompanyId,
      amount: dto.amount.toString(),
      currencyId: dto.currencyId,
      taxAmount: dto.taxAmount.toString(),
      totalAmount: dto.totalAmount.toString(),
      status: dto.status,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      paidDate: dto.paidDate,
      paymentId: dto.paymentId,
      paymentMethod: dto.paymentMethod,
      billingPeriodStart: dto.billingPeriodStart,
      billingPeriodEnd: dto.billingPeriodEnd,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TSubscriptionInvoiceUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.invoiceNumber !== undefined) values.invoiceNumber = dto.invoiceNumber
    if (dto.subscriptionId !== undefined) values.subscriptionId = dto.subscriptionId
    if (dto.managementCompanyId !== undefined) values.managementCompanyId = dto.managementCompanyId
    if (dto.amount !== undefined) values.amount = dto.amount.toString()
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.taxAmount !== undefined) values.taxAmount = dto.taxAmount.toString()
    if (dto.totalAmount !== undefined) values.totalAmount = dto.totalAmount.toString()
    if (dto.status !== undefined) values.status = dto.status
    if (dto.issueDate !== undefined) values.issueDate = dto.issueDate
    if (dto.dueDate !== undefined) values.dueDate = dto.dueDate
    if (dto.paidDate !== undefined) values.paidDate = dto.paidDate
    if (dto.paymentId !== undefined) values.paymentId = dto.paymentId
    if (dto.paymentMethod !== undefined) values.paymentMethod = dto.paymentMethod
    if (dto.billingPeriodStart !== undefined) values.billingPeriodStart = dto.billingPeriodStart
    if (dto.billingPeriodEnd !== undefined) values.billingPeriodEnd = dto.billingPeriodEnd
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    return values
  }

  /**
   * Get all invoices by subscription ID
   */
  async listBySubscriptionId(subscriptionId: string): Promise<TSubscriptionInvoice[]> {
    const results = await this.db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionInvoices.issueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Get invoices by management company ID with optional filters
   */
  async listByCompanyId(
    companyId: string,
    query?: ISubscriptionInvoicesQuery
  ): Promise<TSubscriptionInvoice[]> {
    const conditions = [eq(subscriptionInvoices.managementCompanyId, companyId)]

    if (query?.status) {
      conditions.push(eq(subscriptionInvoices.status, query.status))
    }

    if (query?.dateFrom && query?.dateTo) {
      conditions.push(between(subscriptionInvoices.issueDate, query.dateFrom, query.dateTo))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const results = await this.db
      .select()
      .from(subscriptionInvoices)
      .where(whereClause)
      .orderBy(desc(subscriptionInvoices.issueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, paymentId: string | null): Promise<TSubscriptionInvoice | null> {
    const results = await this.db
      .update(subscriptionInvoices)
      .set({
        status: 'paid',
        paidDate: new Date(),
        paymentId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionInvoices.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Get overdue invoices (status pending and due date passed)
   */
  async getOverdueInvoices(): Promise<TSubscriptionInvoice[]> {
    const now = new Date()

    const results = await this.db
      .select()
      .from(subscriptionInvoices)
      .where(
        and(
          or(
            eq(subscriptionInvoices.status, 'pending'),
            eq(subscriptionInvoices.status, 'sent')
          ),
          sql`${subscriptionInvoices.dueDate} < ${now}`
        )
      )
      .orderBy(subscriptionInvoices.dueDate)

    return results.map(record => this.mapToEntity(record))
  }
}
