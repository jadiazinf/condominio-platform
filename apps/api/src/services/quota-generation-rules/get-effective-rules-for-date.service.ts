import type { TQuotaGenerationRule } from '@packages/domain'
import type { QuotaGenerationRulesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export type TGetEffectiveRulesForDateInput = {
  condominiumId: string
  targetDate: string
}

/**
 * Service to retrieve all quota generation rules effective on a specific date.
 */
export class GetEffectiveRulesForDateService {
  constructor(private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository) {}

  async execute(input: TGetEffectiveRulesForDateInput): Promise<TServiceResult<TQuotaGenerationRule[]>> {
    const { condominiumId, targetDate } = input

    const rules = await this.quotaGenerationRulesRepository.getEffectiveRulesForDate(
      condominiumId,
      targetDate
    )

    return success(rules)
  }
}
