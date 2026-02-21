import type { TBankAccount, TBankAccountCreate } from '@packages/domain'
import type { BankAccountsRepository, BanksRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateBankAccountInput extends TBankAccountCreate {
  managementCompanyId: string
  createdBy: string
}

export class CreateBankAccountService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly bankAccountsRepository: BankAccountsRepository,
    private readonly banksRepository: BanksRepository
  ) {}

  async execute(input: ICreateBankAccountInput): Promise<TServiceResult<TBankAccount>> {
    try {
      // Validate bank exists and supports the requested payment methods
      if (input.bankId) {
        const bank = await this.banksRepository.getById(input.bankId)
        if (!bank) {
          return failure('validation.models.bankAccounts.bankNotFound', 'NOT_FOUND')
        }

        if (bank.supportedPaymentMethods && bank.supportedPaymentMethods.length > 0) {
          const unsupported = input.acceptedPaymentMethods.filter(
            method => !(bank.supportedPaymentMethods as string[]).includes(method)
          )
          if (unsupported.length > 0) {
            return failure(
              `Payment methods not supported by this bank: ${unsupported.join(', ')}`,
              'BAD_REQUEST'
            )
          }
        }
      }

      return await this.db.transaction(async (tx) => {
        const txRepo = this.bankAccountsRepository.withTx(tx)

        const createData = {
          ...input,
          managementCompanyId: input.managementCompanyId,
          createdBy: input.createdBy,
        }

        const bankAccount = await txRepo.create(createData as unknown as TBankAccountCreate)

        if (!input.appliesToAllCondominiums && input.condominiumIds && input.condominiumIds.length > 0) {
          await txRepo.assignCondominiums(bankAccount.id, input.condominiumIds, input.createdBy)
        }

        const result = await txRepo.getByIdWithCondominiums(bankAccount.id)

        return success(result ?? bankAccount)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create bank account'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
