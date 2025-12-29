import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPendingQuotasByUnitInput {
  unitId: string
}

export class GetPendingQuotasByUnitService {
  constructor(private readonly repository: QuotasRepository) {}

  async execute(input: IGetPendingQuotasByUnitInput): Promise<TServiceResult<TQuota[]>> {
    const quotas = await this.repository.getPendingByUnit(input.unitId)
    return success(quotas)
  }
}
