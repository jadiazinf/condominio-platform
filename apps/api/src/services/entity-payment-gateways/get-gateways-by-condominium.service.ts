import type { TEntityPaymentGateway } from '@packages/domain'
import type { EntityPaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGatewaysByCondominiumInput {
  condominiumId: string
  includeInactive?: boolean
}

export class GetGatewaysByCondominiumService {
  constructor(private readonly repository: EntityPaymentGatewaysRepository) {}

  async execute(input: IGetGatewaysByCondominiumInput): Promise<TServiceResult<TEntityPaymentGateway[]>> {
    const gateways = await this.repository.getByCondominiumId(
      input.condominiumId,
      input.includeInactive
    )
    return success(gateways)
  }
}
