import type { TQuotaAdjustment } from '@packages/domain'
import type { QuotaAdjustmentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

type TGetAdjustmentsByUserInput = {
  userId: string
}

/**
 * Service to get all adjustments made by a specific user.
 */
export class GetAdjustmentsByUserService {
  constructor(private readonly quotaAdjustmentsRepository: QuotaAdjustmentsRepository) {}

  async execute(input: TGetAdjustmentsByUserInput): Promise<TServiceResult<TQuotaAdjustment[]>> {
    const adjustments = await this.quotaAdjustmentsRepository.getByCreatedBy(input.userId)
    return success(adjustments)
  }
}
