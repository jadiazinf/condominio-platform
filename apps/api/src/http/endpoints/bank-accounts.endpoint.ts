import type { Hono } from 'hono'
import { BankAccountsRepository, BanksRepository } from '@database/repositories'
import { BankAccountsController } from '../controllers/bank-accounts/bank-accounts.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class BankAccountsEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: BankAccountsController

  constructor(db: TDrizzleClient) {
    const repository = new BankAccountsRepository(db)
    const banksRepository = new BanksRepository(db)
    this.controller = new BankAccountsController(repository, banksRepository, db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
