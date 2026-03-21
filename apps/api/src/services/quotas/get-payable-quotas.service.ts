import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentConceptBankAccountsRepository,
  BankAccountsRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

const BNC_BANK_CODE = '0191'

export interface IPayableQuotasInput {
  unitId: string
  conceptIds: string[]
}

export interface IPayableQuotaGroup {
  concept: {
    id: string
    name: string
    conceptType: string
    currencyId: string
    allowsPartialPayment: boolean
  }
  quotas: TQuota[]
  bankAccounts: IPayableBankAccount[]
}

export interface IPayableBankAccount {
  id: string
  displayName: string
  bankName: string
  bankCode: string
  isBnc: boolean
  acceptedPaymentMethods: string[]
}

export interface IPayableQuotasOutput {
  groups: IPayableQuotaGroup[]
}

/**
 * Returns unpaid quotas for a unit grouped by payment concept,
 * enriched with bank account info and BNC availability flag.
 *
 * Used by the payment wizard (Step 1) to display payable quotas.
 */
export class GetPayableQuotasService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly conceptBankAccountsRepo: PaymentConceptBankAccountsRepository,
    private readonly bankAccountsRepo: BankAccountsRepository,
    private readonly conceptsRepo: PaymentConceptsRepository,
  ) {}

  async execute(input: IPayableQuotasInput): Promise<TServiceResult<IPayableQuotasOutput>> {
    const groups: IPayableQuotaGroup[] = []

    for (const conceptId of input.conceptIds) {
      const concept = await this.conceptsRepo.getById(conceptId)
      if (!concept) continue

      const quotas = await this.quotasRepo.getUnpaidByConceptAndUnit(conceptId, input.unitId)
      if (quotas.length === 0) continue

      const bankAccounts = await this.resolveBankAccounts(conceptId)

      groups.push({
        concept: {
          id: concept.id,
          name: concept.name,
          conceptType: concept.conceptType,
          currencyId: concept.currencyId,
          allowsPartialPayment: concept.allowsPartialPayment,
        },
        quotas,
        bankAccounts,
      })
    }

    return success({ groups })
  }

  private async resolveBankAccounts(conceptId: string): Promise<IPayableBankAccount[]> {
    const links = await this.conceptBankAccountsRepo.listByConceptId(conceptId)
    const accounts: IPayableBankAccount[] = []

    for (const link of links) {
      const account = await this.bankAccountsRepo.getById(link.bankAccountId)
      if (!account || !account.isActive) continue

      const details = account.accountDetails as { bankCode?: string }
      const bankCode = details.bankCode ?? ''

      accounts.push({
        id: account.id,
        displayName: account.displayName,
        bankName: account.bankName,
        bankCode,
        isBnc: bankCode === BNC_BANK_CODE,
        acceptedPaymentMethods: account.acceptedPaymentMethods,
      })
    }

    return accounts
  }
}
