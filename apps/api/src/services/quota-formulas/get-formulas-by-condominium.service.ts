import type { TQuotaFormula } from '@packages/domain'
import type { QuotaFormulasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export type TGetFormulasByCondominiumInput = {
  condominiumId: string
  includeInactive?: boolean
}

/**
 * Service to retrieve all quota formulas for a condominium.
 */
export class GetFormulasByCondominiumService {
  constructor(private readonly quotaFormulasRepository: QuotaFormulasRepository) {}

  async execute(input: TGetFormulasByCondominiumInput): Promise<TServiceResult<TQuotaFormula[]>> {
    const { condominiumId, includeInactive = false } = input

    const formulas = await this.quotaFormulasRepository.getByCondominiumId(
      condominiumId,
      includeInactive
    )

    return success(formulas)
  }
}
