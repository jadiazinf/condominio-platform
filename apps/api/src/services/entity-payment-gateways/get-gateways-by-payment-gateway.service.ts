import type { TEntityPaymentGateway } from '@packages/domain'
import type { EntityPaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGatewaysByPaymentGatewayInput {
  paymentGatewayId: string
  includeInactive?: boolean
}

export class GetGatewaysByPaymentGatewayService {
  constructor(private readonly repository: EntityPaymentGatewaysRepository) {}

  async execute(input: IGetGatewaysByPaymentGatewayInput): Promise<TServiceResult<TEntityPaymentGateway[]>> {
    const gateways = await this.repository.getByPaymentGatewayId(
      input.paymentGatewayId,
      input.includeInactive
    )
    return success(gateways)
  }
}
