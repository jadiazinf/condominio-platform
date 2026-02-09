import type { Hono } from 'hono'
import { PaymentPendingAllocationsRepository, QuotasRepository } from '@database/repositories'
import { PaymentPendingAllocationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PaymentPendingAllocationsEndpoint implements IEndpoint {
  readonly path = '/condominium/payment-pending-allocations'
  private readonly controller: PaymentPendingAllocationsController

  constructor(db: TDrizzleClient) {
    const paymentPendingAllocationsRepository = new PaymentPendingAllocationsRepository(db)
    const quotasRepository = new QuotasRepository(db)

    this.controller = new PaymentPendingAllocationsController(
      paymentPendingAllocationsRepository,
      quotasRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
