import type { TCondominium } from '@packages/domain'
import type { CondominiumsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetCondominiumByCodeInput {
  code: string
}

export class GetCondominiumByCodeService {
  constructor(private readonly repository: CondominiumsRepository) {}

  async execute(input: IGetCondominiumByCodeInput): Promise<TServiceResult<TCondominium>> {
    const condominium = await this.repository.getByCode(input.code)

    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    return success(condominium)
  }
}
