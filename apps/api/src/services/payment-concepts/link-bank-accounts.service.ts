import type { TPaymentConceptBankAccount } from '@packages/domain'
import type { PaymentConceptsRepository, PaymentConceptBankAccountsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

type TBankAccountsRepo = {
  getById: (id: string) => Promise<{
    id: string
    managementCompanyId: string
    isActive: boolean
    appliesToAllCondominiums: boolean
  } | null>
}

type TBankAccountCondominiumsRepo = {
  getByBankAccountAndCondominium: (bankAccountId: string, condominiumId: string) => Promise<{ id: string } | null>
}

export interface ILinkBankAccountInput {
  paymentConceptId: string
  bankAccountId: string
  managementCompanyId: string
  assignedBy: string | null
}

export interface IUnlinkBankAccountInput {
  paymentConceptId: string
  bankAccountId: string
}

export class LinkBankAccountsService {
  constructor(
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly bankAccountsRepo: TBankAccountsRepo,
    private readonly bankAccountCondominiumsRepo: TBankAccountCondominiumsRepo,
    private readonly conceptBankAccountsRepo: PaymentConceptBankAccountsRepository
  ) {}

  async link(input: ILinkBankAccountInput): Promise<TServiceResult<TPaymentConceptBankAccount>> {
    // Validate concept exists
    const concept = await this.conceptsRepo.getById(input.paymentConceptId)
    if (!concept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }

    // Validate bank account exists and is active
    const bankAccount = await this.bankAccountsRepo.getById(input.bankAccountId)
    if (!bankAccount) {
      return failure('Bank account not found', 'NOT_FOUND')
    }

    if (!bankAccount.isActive) {
      return failure('Bank account is not active', 'BAD_REQUEST')
    }

    // Validate bank account belongs to same MC
    if (bankAccount.managementCompanyId !== input.managementCompanyId) {
      return failure('Bank account does not belong to your management company', 'BAD_REQUEST')
    }

    // Validate bank account is associated with the concept's condominium
    if (!bankAccount.appliesToAllCondominiums && concept.condominiumId) {
      const association = await this.bankAccountCondominiumsRepo.getByBankAccountAndCondominium(
        input.bankAccountId,
        concept.condominiumId
      )
      if (!association) {
        return failure('Bank account is not associated with this condominium', 'BAD_REQUEST')
      }
    }

    // Check for duplicate
    const existing = await this.conceptBankAccountsRepo.getLink(
      input.paymentConceptId,
      input.bankAccountId
    )
    if (existing) {
      return failure('Bank account is already linked to this concept', 'CONFLICT')
    }

    try {
      const link = await this.conceptBankAccountsRepo.linkBankAccount(
        input.paymentConceptId,
        input.bankAccountId,
        input.assignedBy
      )
      return success(link)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link bank account'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  async unlink(input: IUnlinkBankAccountInput): Promise<TServiceResult<boolean>> {
    const existing = await this.conceptBankAccountsRepo.getLink(
      input.paymentConceptId,
      input.bankAccountId
    )
    if (!existing) {
      return failure('Link not found', 'NOT_FOUND')
    }

    await this.conceptBankAccountsRepo.unlinkBankAccount(
      input.paymentConceptId,
      input.bankAccountId
    )
    return success(true)
  }

  async listByConceptId(conceptId: string): Promise<TServiceResult<TPaymentConceptBankAccount[]>> {
    const links = await this.conceptBankAccountsRepo.listByConceptId(conceptId)
    return success(links)
  }
}
