import type { Hono } from 'hono'
import { AuditLogsRepository } from '@database/repositories'
import { AuditLogsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AuditLogsEndpoint implements IEndpoint {
  readonly path = '/platform/audit-logs'
  private readonly controller: AuditLogsController

  constructor(db: TDrizzleClient) {
    const repository = new AuditLogsRepository(db)
    this.controller = new AuditLogsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
