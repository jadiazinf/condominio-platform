import type { TSubscriptionInvoice } from '@packages/domain'
import type { SubscriptionInvoicesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IMarkInvoicePaidInput {
  invoiceId: string
  paymentId?: string
  paymentMethod?: string
}

/**
 * Service for marking an invoice as paid.
 * Updates status to 'paid' and records payment details.
 */
export class MarkInvoicePaidService {
  constructor(private readonly invoicesRepository: SubscriptionInvoicesRepository) {}

  async execute(input: IMarkInvoicePaidInput): Promise<TServiceResult<TSubscriptionInvoice>> {
    // Check if invoice exists
    const existing = await this.invoicesRepository.getById(input.invoiceId)

    if (!existing) {
      return failure('Invoice not found', 'NOT_FOUND')
    }

    // Check if already paid
    if (existing.status === 'paid') {
      return failure('Invoice is already paid', 'BAD_REQUEST')
    }

    // Check if cancelled
    if (existing.status === 'cancelled') {
      return failure('Cannot mark a cancelled invoice as paid', 'BAD_REQUEST')
    }

    // Mark as paid
    const paid = await this.invoicesRepository.markAsPaid(input.invoiceId, input.paymentId ?? null)

    if (!paid) {
      return failure('Failed to mark invoice as paid', 'INTERNAL_ERROR')
    }

    // Update payment method if provided
    if (input.paymentMethod) {
      const updated = await this.invoicesRepository.update(input.invoiceId, {
        paymentMethod: input.paymentMethod,
      })

      if (updated) {
        return success(updated)
      }
    }

    return success(paid)
  }
}
