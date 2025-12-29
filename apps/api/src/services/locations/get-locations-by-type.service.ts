import type { TLocation, TLocationType } from '@packages/domain'
import type { LocationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetLocationsByTypeInput {
  locationType: TLocationType
  includeInactive?: boolean
}

export class GetLocationsByTypeService {
  constructor(private readonly repository: LocationsRepository) {}

  async execute(input: IGetLocationsByTypeInput): Promise<TServiceResult<TLocation[]>> {
    const locations = await this.repository.getByType(input.locationType, input.includeInactive)
    return success(locations)
  }
}
