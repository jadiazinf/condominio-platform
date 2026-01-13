import type { TPaymentPendingAllocation } from '@packages/domain'
import type { PaymentPendingAllocationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export type TGetPendingAllocationsInput = {
  // Optional filter by payment
  paymentId?: string
}

/**
 * Service to retrieve all pending (unresolved) allocations.
 */
export class GetPendingAllocationsService {
  constructor(
    private readonly paymentPendingAllocationsRepository: PaymentPendingAllocationsRepository
  ) {}

  async execute(
    input: TGetPendingAllocationsInput = {}
  ): Promise<TServiceResult<TPaymentPendingAllocation[]>> {
    const { paymentId } = input

    let allocations: TPaymentPendingAllocation[]

    if (paymentId) {
      allocations = await this.paymentPendingAllocationsRepository.getPendingByPaymentId(paymentId)
    } else {
      allocations = await this.paymentPendingAllocationsRepository.getPendingAllocations()
    }

    return success(allocations)
  }
}
