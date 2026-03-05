import type { Hono } from 'hono'
import { QuotasRepository, PaymentsRepository, ExpensesRepository, DocumentsRepository, CondominiumServicesRepository } from '@database/repositories'
import { McReserveFundController } from '../controllers/reserve-fund'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class McReserveFundEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: McReserveFundController

  constructor(db: TDrizzleClient) {
    const quotasRepo = new QuotasRepository(db)
    const paymentsRepo = new PaymentsRepository(db)
    const expensesRepo = new ExpensesRepository(db)
    const documentsRepo = new DocumentsRepository(db)
    const servicesRepo = new CondominiumServicesRepository(db)

    this.controller = new McReserveFundController({
      quotasRepo,
      paymentsRepo,
      expensesRepo,
      documentsRepo,
      servicesRepo,
    })
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
