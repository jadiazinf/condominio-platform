import type { TBankAccount } from '@packages/domain'
import type { BankAccountsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IDeactivateBankAccountInput {
  bankAccountId: string
  managementCompanyId: string
  deactivatedBy: string
}

export class DeactivateBankAccountService {
  constructor(
    private readonly bankAccountsRepository: BankAccountsRepository
  ) {}

  async execute(input: IDeactivateBankAccountInput): Promise<TServiceResult<TBankAccount>> {
    const existing = await this.bankAccountsRepository.getById(input.bankAccountId, true)

    if (!existing) {
      return failure('Bank account not found', 'NOT_FOUND')
    }

    if (existing.managementCompanyId !== input.managementCompanyId) {
      return failure('Bank account does not belong to this management company', 'BAD_REQUEST')
    }

    if (!existing.isActive) {
      return failure('Bank account is already deactivated', 'CONFLICT')
    }

    const deactivated = await this.bankAccountsRepository.deactivate(
      input.bankAccountId,
      input.deactivatedBy
    )

    if (!deactivated) {
      return failure('Failed to deactivate bank account', 'INTERNAL_ERROR')
    }

    return success(deactivated)
  }
}
