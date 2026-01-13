import type { TQuotaGenerationRule } from '@packages/domain'
import type { QuotaGenerationRulesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TGetApplicableRuleInput = {
  condominiumId: string
  paymentConceptId: string
  targetDate: string
  buildingId?: string
}

/**
 * Service to find the applicable quota generation rule for a specific context.
 * Prioritizes building-specific rules over condominium-level rules.
 */
export class GetApplicableRuleService {
  constructor(private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository) {}

  async execute(input: TGetApplicableRuleInput): Promise<TServiceResult<TQuotaGenerationRule>> {
    const { condominiumId, paymentConceptId, targetDate, buildingId } = input

    const rule = await this.quotaGenerationRulesRepository.getApplicableRule(
      condominiumId,
      paymentConceptId,
      targetDate,
      buildingId
    )

    if (!rule) {
      return failure('No applicable rule found for the given parameters', 'NOT_FOUND')
    }

    return success(rule)
  }
}
