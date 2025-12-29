import type { TAuditLog } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByDateRangeInput {
  startDate: Date
  endDate: Date
}

export class GetAuditLogsByDateRangeService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByDateRangeInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByDateRange(input.startDate, input.endDate)
    return success(logs)
  }
}
