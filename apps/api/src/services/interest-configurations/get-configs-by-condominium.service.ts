import type { TInterestConfiguration } from '@packages/domain'
import type { InterestConfigurationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetConfigsByCondominiumInput {
  condominiumId: string
  includeInactive?: boolean
}

export class GetConfigsByCondominiumService {
  constructor(private readonly repository: InterestConfigurationsRepository) {}

  async execute(input: IGetConfigsByCondominiumInput): Promise<TServiceResult<TInterestConfiguration[]>> {
    const configs = await this.repository.getByCondominiumId(
      input.condominiumId,
      input.includeInactive
    )
    return success(configs)
  }
}
