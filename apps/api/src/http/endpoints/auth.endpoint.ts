import type { Hono } from 'hono'
import { UsersRepository } from '@database/repositories'
import { AuthController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AuthEndpoint implements IEndpoint {
  readonly path = '/auth'
  private readonly controller: AuthController

  constructor(db: TDrizzleClient) {
    const usersRepository = new UsersRepository(db)
    this.controller = new AuthController(usersRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
