import type { Hono } from 'hono'
import { ReportsController } from '../controllers/reports/reports.controller'
import type { IEndpoint } from './types'

/**
 * Endpoint for report generation (account statements, debtors report, etc.).
 * Does not require a database connection in the constructor since the controller
 * accesses DatabaseService directly when handling requests.
 */
export class ReportsEndpoint implements IEndpoint {
  readonly path = '/condominium/reports'
  private readonly controller: ReportsController

  constructor() {
    this.controller = new ReportsController()
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
