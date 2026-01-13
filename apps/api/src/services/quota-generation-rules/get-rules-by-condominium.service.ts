import type { TQuotaGenerationRule } from '@packages/domain'
import type { QuotaGenerationRulesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export type TGetRulesByCondominiumInput = {
  condominiumId: string
  includeInactive?: boolean
}

/**
 * Service to retrieve all quota generation rules for a condominium.
 */
export class GetRulesByCondominiumService {
  constructor(private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository) {}

  async execute(
    input: TGetRulesByCondominiumInput
  ): Promise<TServiceResult<TQuotaGenerationRule[]>> {
    const { condominiumId, includeInactive = false } = input

    const rules = await this.quotaGenerationRulesRepository.getByCondominiumId(
      condominiumId,
      includeInactive
    )

    return success(rules)
  }
}
