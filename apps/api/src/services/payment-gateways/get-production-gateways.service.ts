import type { TPaymentGateway } from '@packages/domain'
import type { PaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export class GetProductionGatewaysService {
  constructor(private readonly repository: PaymentGatewaysRepository) {}

  async execute(): Promise<TServiceResult<TPaymentGateway[]>> {
    const gateways = await this.repository.getProductionGateways()
    return success(gateways)
  }
}
