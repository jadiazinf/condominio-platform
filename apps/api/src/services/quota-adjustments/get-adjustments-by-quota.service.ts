import type { TQuotaAdjustment } from '@packages/domain'
import type { QuotaAdjustmentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

type TGetAdjustmentsByQuotaInput = {
  quotaId: string
}

/**
 * Service to get all adjustments for a specific quota.
 */
export class GetAdjustmentsByQuotaService {
  constructor(private readonly quotaAdjustmentsRepository: QuotaAdjustmentsRepository) {}

  async execute(input: TGetAdjustmentsByQuotaInput): Promise<TServiceResult<TQuotaAdjustment[]>> {
    const adjustments = await this.quotaAdjustmentsRepository.getByQuotaId(input.quotaId)
    return success(adjustments)
  }
}
