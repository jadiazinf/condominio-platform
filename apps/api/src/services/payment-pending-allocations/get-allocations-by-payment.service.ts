import type { TPaymentPendingAllocation } from '@packages/domain'
import type { PaymentPendingAllocationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export type TGetAllocationsByPaymentInput = {
  paymentId: string
}

/**
 * Service to retrieve all allocations (regardless of status) for a payment.
 */
export class GetAllocationsByPaymentService {
  constructor(
    private readonly paymentPendingAllocationsRepository: PaymentPendingAllocationsRepository
  ) {}

  async execute(
    input: TGetAllocationsByPaymentInput
  ): Promise<TServiceResult<TPaymentPendingAllocation[]>> {
    const { paymentId } = input

    const allocations = await this.paymentPendingAllocationsRepository.getByPaymentId(paymentId)

    return success(allocations)
  }
}
