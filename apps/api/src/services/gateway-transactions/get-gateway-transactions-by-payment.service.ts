import type { TGatewayTransaction } from '@packages/domain'
import type { GatewayTransactionsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGatewayTransactionsByPaymentInput {
  paymentId: string
}

/**
 * Retrieves all gateway transactions for a given payment.
 */
export class GetGatewayTransactionsByPaymentService {
  constructor(
    private readonly gatewayTransactionsRepository: GatewayTransactionsRepository
  ) {}

  async execute(
    input: IGetGatewayTransactionsByPaymentInput
  ): Promise<TServiceResult<TGatewayTransaction[]>> {
    const transactions = await this.gatewayTransactionsRepository.getByPaymentId(input.paymentId)
    return success(transactions)
  }
}
