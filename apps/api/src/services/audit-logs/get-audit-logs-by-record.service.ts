import type { TAuditLog } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByRecordInput {
  recordId: string
}

export class GetAuditLogsByRecordService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByRecordInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByRecordId(input.recordId)
    return success(logs)
  }
}
