import type { TQuotaGenerationRule, TQuotaGenerationRuleCreate } from '@packages/domain'
import type {
  QuotaGenerationRulesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  PaymentConceptsRepository,
  QuotaFormulasRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export type TCreateQuotaGenerationRuleInput = {
  condominiumId: string
  buildingId?: string | null
  paymentConceptId: string
  quotaFormulaId: string
  name: string
  description?: string | null
  effectiveFrom: string
  effectiveTo?: string | null
  createdByUserId: string
}

/**
 * Service to create a new quota generation rule.
 * Rules define which formula to use for a specific payment concept.
 */
export class CreateQuotaGenerationRuleService {
  constructor(
    private readonly quotaGenerationRulesRepository: QuotaGenerationRulesRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly buildingsRepository: BuildingsRepository,
    private readonly paymentConceptsRepository: PaymentConceptsRepository,
    private readonly quotaFormulasRepository: QuotaFormulasRepository
  ) {}

  async execute(
    input: TCreateQuotaGenerationRuleInput
  ): Promise<TServiceResult<TQuotaGenerationRule>> {
    const {
      condominiumId,
      buildingId,
      paymentConceptId,
      quotaFormulaId,
      name,
      description,
      effectiveFrom,
      effectiveTo,
      createdByUserId,
    } = input

    // 1. Validate condominium exists
    const condominium = await this.condominiumsRepository.getById(condominiumId)
    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    // 2. Validate building if provided
    if (buildingId) {
      const building = await this.buildingsRepository.getById(buildingId)
      if (!building) {
        return failure('Building not found', 'NOT_FOUND')
      }
      // Verify building belongs to condominium
      if (building.condominiumId !== condominiumId) {
        return failure('Building does not belong to the specified condominium', 'BAD_REQUEST')
      }
    }

    // 3. Validate payment concept exists
    const paymentConcept = await this.paymentConceptsRepository.getById(paymentConceptId)
    if (!paymentConcept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }

    // 4. Validate quota formula exists and belongs to the same condominium
    const quotaFormula = await this.quotaFormulasRepository.getById(quotaFormulaId)
    if (!quotaFormula) {
      return failure('Quota formula not found', 'NOT_FOUND')
    }
    if (quotaFormula.condominiumId !== condominiumId) {
      return failure('Quota formula does not belong to the specified condominium', 'BAD_REQUEST')
    }
    if (!quotaFormula.isActive) {
      return failure('Quota formula is not active', 'BAD_REQUEST')
    }

    // 5. Validate date range
    if (effectiveTo && effectiveFrom > effectiveTo) {
      return failure(
        'Effective from date must be before or equal to effective to date',
        'BAD_REQUEST'
      )
    }

    // 6. Check for overlapping rules with same concept
    const existingRules =
      await this.quotaGenerationRulesRepository.getByPaymentConceptId(paymentConceptId)
    const overlappingRules = existingRules.filter(rule => {
      // Only check rules for the same scope (condominium or building level)
      if (buildingId) {
        if (rule.buildingId !== buildingId) return false
      } else {
        if (rule.buildingId !== null) return false
      }

      // Check for date overlap
      const ruleStart = rule.effectiveFrom
      const ruleEnd = rule.effectiveTo

      // If existing rule has no end date, it extends indefinitely
      if (!ruleEnd && !effectiveTo) {
        return effectiveFrom <= ruleStart || ruleStart <= effectiveFrom
      }
      if (!ruleEnd) {
        return effectiveTo! >= ruleStart
      }
      if (!effectiveTo) {
        return effectiveFrom <= ruleEnd
      }

      // Both have end dates - check for overlap
      return effectiveFrom <= ruleEnd && effectiveTo >= ruleStart
    })

    if (overlappingRules.length > 0) {
      return failure(
        'A rule already exists for this payment concept in the specified date range',
        'CONFLICT'
      )
    }

    // 7. Create the rule
    const ruleData: TQuotaGenerationRuleCreate = {
      condominiumId,
      buildingId: buildingId ?? null,
      paymentConceptId,
      quotaFormulaId,
      name,
      description: description ?? null,
      effectiveFrom,
      effectiveTo: effectiveTo ?? null,
      isActive: true,
      createdBy: createdByUserId,
    }

    const rule = await this.quotaGenerationRulesRepository.create(ruleData)

    return success(rule)
  }
}
