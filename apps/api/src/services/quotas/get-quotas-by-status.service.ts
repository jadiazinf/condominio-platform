import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetQuotasByStatusInput {
  status: TQuota['status']
}

export class GetQuotasByStatusService {
  constructor(private readonly repository: QuotasRepository) {}

  async execute(input: IGetQuotasByStatusInput): Promise<TServiceResult<TQuota[]>> {
    const quotas = await this.repository.getByStatus(input.status)
    return success(quotas)
  }
}
