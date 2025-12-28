import type { Hono } from 'hono'
import { UsersRepository } from '@database/repositories'
import { UsersController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UsersEndpoint implements IEndpoint {
  readonly path = '/users'
  private readonly controller: UsersController

  constructor(db: TDrizzleClient) {
    const repository = new UsersRepository(db)
    this.controller = new UsersController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
