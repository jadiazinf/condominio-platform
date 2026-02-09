import type { Hono } from 'hono'
import { QuotasRepository, QuotaAdjustmentsRepository } from '@database/repositories'
import { QuotaAdjustmentsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class QuotaAdjustmentsEndpoint implements IEndpoint {
  readonly path = '/condominium/quota-adjustments'
  private readonly controller: QuotaAdjustmentsController

  constructor(db: TDrizzleClient) {
    const quotasRepository = new QuotasRepository(db)
    const quotaAdjustmentsRepository = new QuotaAdjustmentsRepository(db)
    this.controller = new QuotaAdjustmentsController(db, quotasRepository, quotaAdjustmentsRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
