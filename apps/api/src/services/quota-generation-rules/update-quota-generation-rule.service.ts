import type { TQuotaGenerationRule, TQuotaGenerationRuleUpdate } from '@packages/domain'
import type {
  QuotaGenerationRulesRepository,
  BuildingsRepository,
  PaymentConceptsRepository,
  QuotaFormulasRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TUpdateQuotaGenerationRuleInput = {
  ruleId: string
  buildingId?: string | null
  paymentConceptId?: string
  quotaFormulaId?: string
  name?: string
  description?: string | null
  effectiveFrom?: string
  effectiveTo?: string | null
  isActive?: boolean
  updatedByUserId: string
  updateReason?: string | null
}

/**
 * Service to update an existing quota generation rule.
 * Maintains traceability of who updated and why.
 */
export class UpdateQuotaGenerationRuleService {
  constructor(
    private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository,
    private readonly buildingsRepository: BuildingsRepository,
    private readonly paymentConceptsRepository: PaymentConceptsRepository,
    private readonly quotaFormulasRepository: QuotaFormulasRepository
  ) {}

  async execute(input: TUpdateQuotaGenerationRuleInput): Promise<TServiceResult<TQuotaGenerationRule>> {
    const { ruleId, updatedByUserId, updateReason, ...updateFields } = input

    // 1. Get existing rule
    const existingRule = await this.quotaGenerationRulesRepository.getById(ruleId)
    if (!existingRule) {
      return failure('Rule not found', 'NOT_FOUND')
    }

    // 2. Validate building if being updated
    if (updateFields.buildingId !== undefined && updateFields.buildingId !== null) {
      const building = await this.buildingsRepository.getById(updateFields.buildingId)
      if (!building) {
        return failure('Building not found', 'NOT_FOUND')
      }
      if (building.condominiumId !== existingRule.condominiumId) {
        return failure('Building does not belong to the rule\'s condominium', 'BAD_REQUEST')
      }
    }

    // 3. Validate payment concept if being updated
    if (updateFields.paymentConceptId !== undefined) {
      const paymentConcept = await this.paymentConceptsRepository.getById(updateFields.paymentConceptId)
      if (!paymentConcept) {
        return failure('Payment concept not found', 'NOT_FOUND')
      }
    }

    // 4. Validate quota formula if being updated
    if (updateFields.quotaFormulaId !== undefined) {
      const quotaFormula = await this.quotaFormulasRepository.getById(updateFields.quotaFormulaId)
      if (!quotaFormula) {
        return failure('Quota formula not found', 'NOT_FOUND')
      }
      if (quotaFormula.condominiumId !== existingRule.condominiumId) {
        return failure('Quota formula does not belong to the rule\'s condominium', 'BAD_REQUEST')
      }
      if (!quotaFormula.isActive) {
        return failure('Quota formula is not active', 'BAD_REQUEST')
      }
    }

    // 5. Validate date range if being updated
    const effectiveFrom = updateFields.effectiveFrom ?? existingRule.effectiveFrom
    const effectiveTo = updateFields.effectiveTo !== undefined
      ? updateFields.effectiveTo
      : existingRule.effectiveTo

    if (effectiveTo && effectiveFrom > effectiveTo) {
      return failure('Effective from date must be before or equal to effective to date', 'BAD_REQUEST')
    }

    // 6. Build update data
    const updateData: TQuotaGenerationRuleUpdate = {
      updatedBy: updatedByUserId,
      updateReason: updateReason ?? null,
    }

    if (updateFields.buildingId !== undefined) updateData.buildingId = updateFields.buildingId
    if (updateFields.paymentConceptId !== undefined) updateData.paymentConceptId = updateFields.paymentConceptId
    if (updateFields.quotaFormulaId !== undefined) updateData.quotaFormulaId = updateFields.quotaFormulaId
    if (updateFields.name !== undefined) updateData.name = updateFields.name
    if (updateFields.description !== undefined) updateData.description = updateFields.description
    if (updateFields.effectiveFrom !== undefined) updateData.effectiveFrom = updateFields.effectiveFrom
    if (updateFields.effectiveTo !== undefined) updateData.effectiveTo = updateFields.effectiveTo
    if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive

    // 7. Update the rule
    const updatedRule = await this.quotaGenerationRulesRepository.update(ruleId, updateData)
    if (!updatedRule) {
      return failure('Failed to update rule', 'INTERNAL_ERROR')
    }

    return success(updatedRule)
  }
}
