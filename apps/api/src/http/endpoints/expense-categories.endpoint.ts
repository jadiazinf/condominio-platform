import type { Hono } from 'hono'
import { ExpenseCategoriesRepository } from '@database/repositories'
import { ExpenseCategoriesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ExpenseCategoriesEndpoint implements IEndpoint {
  readonly path = '/expense-categories'
  private readonly controller: ExpenseCategoriesController

  constructor(db: TDrizzleClient) {
    const repository = new ExpenseCategoriesRepository(db)
    this.controller = new ExpenseCategoriesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
