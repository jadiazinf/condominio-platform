import type { TPaymentGateway, TGatewayType } from '@packages/domain'
import type { PaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGatewaysByTypeInput {
  gatewayType: TGatewayType
  includeInactive?: boolean
}

export class GetGatewaysByTypeService {
  constructor(private readonly repository: PaymentGatewaysRepository) {}

  async execute(input: IGetGatewaysByTypeInput): Promise<TServiceResult<TPaymentGateway[]>> {
    const gateways = await this.repository.getByType(input.gatewayType, input.includeInactive)
    return success(gateways)
  }
}
