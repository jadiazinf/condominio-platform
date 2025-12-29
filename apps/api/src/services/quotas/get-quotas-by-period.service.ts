import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetQuotasByPeriodInput {
  year: number
  month?: number
}

export class GetQuotasByPeriodService {
  constructor(private readonly repository: QuotasRepository) {}

  async execute(input: IGetQuotasByPeriodInput): Promise<TServiceResult<TQuota[]>> {
    const quotas = await this.repository.getByPeriod(input.year, input.month)
    return success(quotas)
  }
}
