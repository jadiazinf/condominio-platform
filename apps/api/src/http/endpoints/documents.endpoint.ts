import type { Hono } from 'hono'
import { DocumentsRepository } from '@database/repositories'
import { DocumentsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class DocumentsEndpoint implements IEndpoint {
  readonly path = '/condominium/documents'
  private readonly controller: DocumentsController

  constructor(db: TDrizzleClient) {
    const repository = new DocumentsRepository(db)
    this.controller = new DocumentsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
