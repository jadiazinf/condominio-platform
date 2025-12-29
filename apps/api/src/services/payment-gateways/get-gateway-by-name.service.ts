import type { TPaymentGateway } from '@packages/domain'
import type { PaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetGatewayByNameInput {
  name: string
}

export class GetGatewayByNameService {
  constructor(private readonly repository: PaymentGatewaysRepository) {}

  async execute(input: IGetGatewayByNameInput): Promise<TServiceResult<TPaymentGateway>> {
    const gateway = await this.repository.getByName(input.name)

    if (!gateway) {
      return failure('Payment gateway not found', 'NOT_FOUND')
    }

    return success(gateway)
  }
}
