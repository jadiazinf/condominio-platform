import type { Hono } from 'hono'
import {
  QuotaGenerationRulesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  PaymentConceptsRepository,
  QuotaFormulasRepository,
} from '@database/repositories'
import { QuotaGenerationRulesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class QuotaGenerationRulesEndpoint implements IEndpoint {
  readonly path = '/condominium/quota-generation-rules'
  private readonly controller: QuotaGenerationRulesController

  constructor(db: TDrizzleClient) {
    const quotaGenerationRulesRepository = new QuotaGenerationRulesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)
    const paymentConceptsRepository = new PaymentConceptsRepository(db)
    const quotaFormulasRepository = new QuotaFormulasRepository(db)

    this.controller = new QuotaGenerationRulesController(
      quotaGenerationRulesRepository,
      condominiumsRepository,
      buildingsRepository,
      paymentConceptsRepository,
      quotaFormulasRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
