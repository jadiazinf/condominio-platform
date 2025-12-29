import type { TAuditLog } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByTableAndRecordInput {
  tableName: string
  recordId: string
}

export class GetAuditLogsByTableAndRecordService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByTableAndRecordInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByTableAndRecord(input.tableName, input.recordId)
    return success(logs)
  }
}
