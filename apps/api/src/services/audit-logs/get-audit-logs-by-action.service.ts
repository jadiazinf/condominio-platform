import type { TAuditLog, TAuditAction } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByActionInput {
  action: TAuditAction
}

export class GetAuditLogsByActionService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByActionInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByAction(input.action)
    return success(logs)
  }
}
