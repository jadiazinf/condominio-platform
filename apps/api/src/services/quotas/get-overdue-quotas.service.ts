import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetOverdueQuotasInput {
  asOfDate: string
}

export class GetOverdueQuotasService {
  constructor(private readonly repository: QuotasRepository) {}

  async execute(input: IGetOverdueQuotasInput): Promise<TServiceResult<TQuota[]>> {
    const quotas = await this.repository.getOverdue(input.asOfDate)
    return success(quotas)
  }
}
