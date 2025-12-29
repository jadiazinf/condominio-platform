import type { TLocation } from '@packages/domain'
import type { LocationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetLocationsByParentInput {
  parentId: string
}

export class GetLocationsByParentService {
  constructor(private readonly repository: LocationsRepository) {}

  async execute(input: IGetLocationsByParentInput): Promise<TServiceResult<TLocation[]>> {
    const locations = await this.repository.getByParentId(input.parentId)
    return success(locations)
  }
}
