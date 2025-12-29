import type { TCondominium } from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetCondominiumsByLocationInput {
  locationId: string
  includeInactive?: boolean
}

export class GetCondominiumsByLocationService {
  constructor(private readonly repository: CondominiumsRepository) {}

  async execute(input: IGetCondominiumsByLocationInput): Promise<TServiceResult<TCondominium[]>> {
    const condominiums = await this.repository.getByLocationId(
      input.locationId,
      input.includeInactive
    )
    return success(condominiums)
  }
}
