import type { TSubscriptionInvoice, TSubscriptionInvoiceCreate } from '@packages/domain'
import type {
  SubscriptionInvoicesRepository,
  ManagementCompanySubscriptionsRepository,
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
 * Calculates total amount including taxes.
 */
export class GenerateInvoiceService {
  constructor(
    private readonly invoicesRepository: SubscriptionInvoicesRepository,
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
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

    // Calculate amounts
    const amount = subscription.basePrice
    const taxAmount = input.taxAmount ?? 0
    const totalAmount = amount + taxAmount

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
