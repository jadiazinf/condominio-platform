import type { Hono } from 'hono'
import { ExpensesRepository } from '@database/repositories'
import { ExpensesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ExpensesEndpoint implements IEndpoint {
  readonly path = '/expenses'
  private readonly controller: ExpensesController

  constructor(db: TDrizzleClient) {
    const repository = new ExpensesRepository(db)
    this.controller = new ExpensesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
