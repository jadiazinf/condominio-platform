import type { TEntityPaymentGateway } from '@packages/domain'
import type { EntityPaymentGatewaysRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGatewaysByBuildingInput {
  buildingId: string
  includeInactive?: boolean
}

export class GetGatewaysByBuildingService {
  constructor(private readonly repository: EntityPaymentGatewaysRepository) {}

  async execute(input: IGetGatewaysByBuildingInput): Promise<TServiceResult<TEntityPaymentGateway[]>> {
    const gateways = await this.repository.getByBuildingId(
      input.buildingId,
      input.includeInactive
    )
    return success(gateways)
  }
}
