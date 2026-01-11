import type { TQuotaAdjustment, TAdjustmentType } from '@packages/domain'
import type { QuotaAdjustmentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

type TGetAdjustmentsByTypeInput = {
  adjustmentType: TAdjustmentType
}

/**
 * Service to get all adjustments of a specific type.
 */
export class GetAdjustmentsByTypeService {
  constructor(private readonly quotaAdjustmentsRepository: QuotaAdjustmentsRepository) {}

  async execute(input: TGetAdjustmentsByTypeInput): Promise<TServiceResult<TQuotaAdjustment[]>> {
    const adjustments = await this.quotaAdjustmentsRepository.getByType(input.adjustmentType)
    return success(adjustments)
  }
}
