import type { TSubscriptionInvoice, TSubscriptionInvoiceCreate } from '@packages/domain'
import type {
  SubscriptionInvoicesRepository,
  ManagementCompanySubscriptionsRepository,
  SubscriptionRatesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGenerateInvoiceInput {
  subscriptionId: string
  billingPeriodStart: Date
  billingPeriodEnd: Date
  dueDate: Date
  taxAmount?: number
}

/**
 * Service for generating a new invoice for a subscription.
 * Calculates total amount including taxes. If the subscription has a rate with
 * a taxRate configured, it auto-calculates the taxAmount (e.g. 16% IVA).
 */
export class GenerateInvoiceService {
  constructor(
    private readonly invoicesRepository: SubscriptionInvoicesRepository,
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    private readonly ratesRepository: SubscriptionRatesRepository
  ) {}

  async execute(input: IGenerateInvoiceInput): Promise<TServiceResult<TSubscriptionInvoice>> {
    // Get subscription
    const subscription = await this.subscriptionsRepository.getById(input.subscriptionId)

    if (!subscription) {
      return failure('Subscription not found', 'NOT_FOUND')
    }

    // Check if subscription is active
    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return failure('Cannot generate invoice for inactive subscription', 'BAD_REQUEST')
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber()

    // Calculate amounts — auto-compute taxAmount from the rate's taxRate if not provided
    const amount = subscription.basePrice
    let taxAmount = input.taxAmount ?? 0

    if (input.taxAmount === undefined && subscription.rateId) {
      const rate = await this.ratesRepository.getById(subscription.rateId)
      if (rate?.taxRate) {
        taxAmount = Number(amount) * Number(rate.taxRate)
      }
    }

    const totalAmount = Number(amount) + taxAmount

    // Create invoice
    const invoiceData: TSubscriptionInvoiceCreate = {
      invoiceNumber,
      subscriptionId: input.subscriptionId,
      managementCompanyId: subscription.managementCompanyId,
      amount,
      currencyId: subscription.currencyId,
      taxAmount,
      totalAmount,
      status: 'pending',
      issueDate: new Date(),
      dueDate: input.dueDate,
      paidDate: null,
      paymentId: null,
      paymentMethod: null,
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
      metadata: null,
    }

    const invoice = await this.invoicesRepository.create(invoiceData)

    return success(invoice)
  }

  private async generateInvoiceNumber(): Promise<string> {
    // Generate invoice number in format: INV-YYYY-XXXXX
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
    return `INV-${year}-${random}`
  }
}
