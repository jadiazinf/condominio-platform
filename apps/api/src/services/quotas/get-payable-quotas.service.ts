import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentConceptBankAccountsRepository,
  BankAccountsRepository,
  PaymentConceptsRepository,
  CurrenciesRepository,
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
    currencyCode: string
    currencySymbol: string
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
  accountHolderName: string
  accountNumber: string
  accountType: string
  identityDocType: string
  identityDocNumber: string
  phoneNumber: string | null
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
    private readonly currenciesRepo: CurrenciesRepository
  ) {}

  async execute(input: IPayableQuotasInput): Promise<TServiceResult<IPayableQuotasOutput>> {
    if (input.conceptIds.length === 0) {
      return success({ groups: [] })
    }

    // Batch: fetch all data in parallel (3 queries instead of N*3)
    const [concepts, allQuotas, allLinks] = await Promise.all([
      this.conceptsRepo.getByIds(input.conceptIds),
      this.quotasRepo.getUnpaidByConceptsAndUnit(input.conceptIds, input.unitId),
      this.conceptBankAccountsRepo.listByConceptIds(input.conceptIds),
    ])

    // Collect unique bank account IDs and currency IDs, fetch in parallel
    const bankAccountIds = [...new Set(allLinks.map(l => l.bankAccountId))]
    const currencyIds = [...new Set(concepts.map(c => c.currencyId))]

    const [allBankAccounts, allCurrencies] = await Promise.all([
      this.bankAccountsRepo.getByIds(bankAccountIds),
      Promise.all(currencyIds.map(id => this.currenciesRepo.getById(id))),
    ])

    // Index data for fast lookup
    const bankAccountMap = new Map(allBankAccounts.map(a => [a.id, a]))
    const currencyMap = new Map(allCurrencies.filter(Boolean).map(c => [c!.id, c!]))
    const quotasByConceptId = new Map<string, TQuota[]>()
    for (const quota of allQuotas) {
      const list = quotasByConceptId.get(quota.paymentConceptId) ?? []
      list.push(quota)
      quotasByConceptId.set(quota.paymentConceptId, list)
    }
    const linksByConceptId = new Map<string, typeof allLinks>()
    for (const link of allLinks) {
      const list = linksByConceptId.get(link.paymentConceptId) ?? []
      list.push(link)
      linksByConceptId.set(link.paymentConceptId, list)
    }

    // Build groups
    const groups: IPayableQuotaGroup[] = []

    for (const concept of concepts) {
      const quotas = quotasByConceptId.get(concept.id)
      if (!quotas || quotas.length === 0) continue

      const conceptLinks = linksByConceptId.get(concept.id) ?? []
      const bankAccounts: IPayableBankAccount[] = []

      for (const link of conceptLinks) {
        const account = bankAccountMap.get(link.bankAccountId)
        if (!account) continue

        const details = account.accountDetails as {
          bankCode?: string
          accountNumber?: string
          accountType?: string
          identityDocType?: string
          identityDocNumber?: string
          phoneNumber?: string
        }
        const bankCode = details.bankCode ?? ''

        bankAccounts.push({
          id: account.id,
          displayName: account.displayName,
          bankName: account.bankName,
          bankCode,
          isBnc: bankCode === BNC_BANK_CODE,
          acceptedPaymentMethods: account.acceptedPaymentMethods,
          accountHolderName: account.accountHolderName,
          accountNumber: details.accountNumber ?? '',
          accountType: details.accountType ?? '',
          identityDocType: details.identityDocType ?? '',
          identityDocNumber: details.identityDocNumber ?? '',
          phoneNumber: details.phoneNumber ?? null,
        })
      }

      const currency = currencyMap.get(concept.currencyId)

      groups.push({
        concept: {
          id: concept.id,
          name: concept.name,
          conceptType: concept.conceptType,
          currencyId: concept.currencyId,
          currencyCode: currency?.code ?? '',
          currencySymbol: currency?.symbol ?? '$',
          allowsPartialPayment: concept.allowsPartialPayment,
        },
        quotas,
        bankAccounts,
      })
    }

    return success({ groups })
  }
}
