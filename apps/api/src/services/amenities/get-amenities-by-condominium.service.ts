import type { TAmenity } from '@packages/domain'
import type { AmenitiesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAmenitiesByCondominiumInput {
  condominiumId: string
}

export class GetAmenitiesByCondominiumService {
  constructor(private readonly repository: AmenitiesRepository) {}

  async execute(input: IGetAmenitiesByCondominiumInput): Promise<TServiceResult<TAmenity[]>> {
    const amenities = await this.repository.getByCondominiumId(input.condominiumId)
    return success(amenities)
  }
}
