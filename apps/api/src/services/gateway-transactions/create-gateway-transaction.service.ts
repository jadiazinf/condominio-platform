import type { TGatewayTransaction, TGatewayTransactionCreate } from '@packages/domain'
import type { GatewayTransactionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateGatewayTransactionInput {
  paymentId: string
  gatewayType: TGatewayTransactionCreate['gatewayType']
  externalTransactionId?: string | null
  externalReference?: string | null
  requestPayload?: Record<string, unknown> | null
  responsePayload?: Record<string, unknown> | null
  status?: TGatewayTransactionCreate['status']
  errorMessage?: string | null
}

/**
 * Creates a gateway transaction record for audit/tracking purposes.
 */
export class CreateGatewayTransactionService {
  constructor(
    private readonly gatewayTransactionsRepository: GatewayTransactionsRepository
  ) {}

  async execute(input: ICreateGatewayTransactionInput): Promise<TServiceResult<TGatewayTransaction>> {
    const data: TGatewayTransactionCreate = {
      paymentId: input.paymentId,
      gatewayType: input.gatewayType,
      externalTransactionId: input.externalTransactionId ?? null,
      externalReference: input.externalReference ?? null,
      requestPayload: input.requestPayload ?? null,
      responsePayload: input.responsePayload ?? null,
      status: input.status ?? 'initiated',
      attempts: 0,
      maxAttempts: 10,
      lastAttemptAt: null,
      verifiedAt: null,
      errorMessage: input.errorMessage ?? null,
    }

    const transaction = await this.gatewayTransactionsRepository.create(data)

    return success(transaction)
  }
}
