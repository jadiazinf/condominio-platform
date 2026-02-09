import type { Hono } from 'hono'
import {
  QuotaFormulasRepository,
  CondominiumsRepository,
  UnitsRepository,
} from '@database/repositories'
import { QuotaFormulasController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class QuotaFormulasEndpoint implements IEndpoint {
  readonly path = '/condominium/quota-formulas'
  private readonly controller: QuotaFormulasController

  constructor(db: TDrizzleClient) {
    const quotaFormulasRepository = new QuotaFormulasRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const unitsRepository = new UnitsRepository(db)

    this.controller = new QuotaFormulasController(
      quotaFormulasRepository,
      condominiumsRepository,
      unitsRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
