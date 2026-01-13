import type { TPaymentPendingAllocation } from '@packages/domain'
import type { PaymentPendingAllocationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TRefundPendingAllocationInput = {
  allocationId: string
  resolutionNotes: string
  allocatedByUserId: string
}

/**
 * Service to mark a pending allocation as refunded.
 * This is used when the excess amount is returned to the payer.
 */
export class RefundPendingAllocationService {
  constructor(
    private readonly paymentPendingAllocationsRepository: PaymentPendingAllocationsRepository
  ) {}

  async execute(
    input: TRefundPendingAllocationInput
  ): Promise<TServiceResult<TPaymentPendingAllocation>> {
    const { allocationId, resolutionNotes, allocatedByUserId } = input

    // 1. Get the pending allocation
    const allocation = await this.paymentPendingAllocationsRepository.getById(allocationId)
    if (!allocation) {
      return failure('Pending allocation not found', 'NOT_FOUND')
    }

    // 2. Verify it's still pending
    if (allocation.status !== 'pending') {
      return failure(
        `Allocation has already been resolved with status: ${allocation.status}`,
        'BAD_REQUEST'
      )
    }

    // 3. Resolution notes are required for refunds (for audit trail)
    if (!resolutionNotes || resolutionNotes.trim().length === 0) {
      return failure('Resolution notes are required for refund', 'BAD_REQUEST')
    }

    // 4. Update the allocation
    const updatedAllocation = await this.paymentPendingAllocationsRepository.update(allocationId, {
      status: 'refunded',
      resolutionType: 'refunded',
      resolutionNotes,
      allocatedBy: allocatedByUserId,
    })

    if (!updatedAllocation) {
      return failure('Failed to update allocation', 'INTERNAL_ERROR')
    }

    return success(updatedAllocation)
  }
}
