import type { TPayment } from '@packages/domain'
import type { PaymentsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export class GetPendingVerificationPaymentsService {
  constructor(private readonly repository: PaymentsRepository) {}

  async execute(): Promise<TServiceResult<TPayment[]>> {
    const payments = await this.repository.getPendingVerification()
    return success(payments)
  }
}
