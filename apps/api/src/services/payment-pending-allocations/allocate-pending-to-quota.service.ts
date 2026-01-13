import type { TPaymentPendingAllocation } from '@packages/domain'
import type { PaymentPendingAllocationsRepository, QuotasRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TAllocatePendingToQuotaInput = {
  allocationId: string
  quotaId: string
  resolutionNotes?: string | null
  allocatedByUserId: string
}

/**
 * Service to allocate a pending payment amount to a future quota.
 * This is the primary administrative action for resolving excess payments.
 */
export class AllocatePendingToQuotaService {
  constructor(
    private readonly paymentPendingAllocationsRepository: PaymentPendingAllocationsRepository,
    private readonly quotasRepository: QuotasRepository
  ) {}

  async execute(
    input: TAllocatePendingToQuotaInput
  ): Promise<TServiceResult<TPaymentPendingAllocation>> {
    const { allocationId, quotaId, resolutionNotes, allocatedByUserId } = input

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

    // 3. Verify the quota exists
    const quota = await this.quotasRepository.getById(quotaId)
    if (!quota) {
      return failure('Target quota not found', 'NOT_FOUND')
    }

    // 4. Verify the quota is not already paid
    if (quota.status === 'paid') {
      return failure('Cannot allocate to a quota that is already paid', 'BAD_REQUEST')
    }

    // 5. Verify the quota is not cancelled
    if (quota.status === 'cancelled') {
      return failure('Cannot allocate to a cancelled quota', 'BAD_REQUEST')
    }

    // 6. Update the allocation
    const updatedAllocation = await this.paymentPendingAllocationsRepository.update(allocationId, {
      status: 'allocated',
      resolutionType: 'allocated_to_quota',
      resolutionNotes: resolutionNotes ?? null,
      allocatedToQuotaId: quotaId,
      allocatedBy: allocatedByUserId,
    })

    if (!updatedAllocation) {
      return failure('Failed to update allocation', 'INTERNAL_ERROR')
    }

    return success(updatedAllocation)
  }
}
