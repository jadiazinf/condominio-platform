import type { TAuditLog } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetAuditLogsByUserInput {
  userId: string
}

export class GetAuditLogsByUserService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async execute(input: IGetAuditLogsByUserInput): Promise<TServiceResult<TAuditLog[]>> {
    const logs = await this.repository.getByUserId(input.userId)
    return success(logs)
  }
}
