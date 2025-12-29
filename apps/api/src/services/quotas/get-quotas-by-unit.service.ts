import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetQuotasByUnitInput {
  unitId: string
}

export class GetQuotasByUnitService {
  constructor(private readonly repository: QuotasRepository) {}

  async execute(input: IGetQuotasByUnitInput): Promise<TServiceResult<TQuota[]>> {
    const quotas = await this.repository.getByUnitId(input.unitId)
    return success(quotas)
  }
}
