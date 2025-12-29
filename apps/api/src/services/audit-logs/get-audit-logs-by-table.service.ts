import type { TAuditLog } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByTableInput {
  tableName: string
}

export class GetAuditLogsByTableService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByTableInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByTableName(input.tableName)
    return success(logs)
  }
}
