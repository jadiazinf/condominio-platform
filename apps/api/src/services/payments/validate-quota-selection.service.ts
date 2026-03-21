import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentConceptsRepository,
  PaymentConceptBankAccountsRepository,
  BankAccountsRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

const BNC_BANK_CODE = '0191'
const PAYABLE_STATUSES = new Set(['pending', 'partial', 'overdue'])

export interface IValidateQuotaSelectionInput {
  unitId: string
  quotaIds: string[]
  amounts: Record<string, string>
}

export interface IValidatedQuota {
  quotaId: string
  paymentConceptId: string
  amount: string
  balance: string
}

export interface IValidatedBankAccount {
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

export interface IValidateQuotaSelectionOutput {
  validatedQuotas: IValidatedQuota[]
  total: string
  currencyId: string
  commonBankAccounts: IValidatedBankAccount[]
}

/**
 * Validates a user's quota selection for payment.
 *
 * Business rules enforced:
 * 1. All quotas belong to the specified unit
 * 2. All quotas are payable (pending, partial, or overdue)
 * 3. Oldest-first per concept: no skipping older unpaid quotas
 * 4. Partial payment: only allowed when concept.allowsPartialPayment = true
 * 5. Amount must be > 0 and <= balance
 * 6. Same currency across all selected quotas
 * 7. At least one common bank account across all concepts
 */
export class ValidateQuotaSelectionService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly conceptBankAccountsRepo: PaymentConceptBankAccountsRepository,
    private readonly bankAccountsRepo: BankAccountsRepository
  ) {}

  async execute(
    input: IValidateQuotaSelectionInput
  ): Promise<TServiceResult<IValidateQuotaSelectionOutput>> {
    const { unitId, quotaIds, amounts } = input

    // 1. Fetch and validate all quotas
    const quotas: TQuota[] = []
    for (const id of quotaIds) {
      // Validate amount is provided
      if (!amounts[id]) {
        return failure('Falta el monto para la cuota seleccionada', 'BAD_REQUEST')
      }

      const quota = await this.quotasRepo.getById(id)
      if (!quota) {
        return failure(`Cuota no encontrada: ${id}`, 'NOT_FOUND')
      }

      // Ownership check
      if (quota.unitId !== unitId) {
        return failure('La cuota no pertenece a esta unidad', 'BAD_REQUEST')
      }

      // Status check
      if (!PAYABLE_STATUSES.has(quota.status)) {
        return failure(
          `La cuota no está disponible para pago (estado: ${quota.status})`,
          'BAD_REQUEST'
        )
      }

      quotas.push(quota)
    }

    // 2. Validate amounts
    const validatedQuotas: IValidatedQuota[] = []

    // Group quotas by concept for rule validation
    const quotasByConceptId = new Map<string, TQuota[]>()
    for (const quota of quotas) {
      const group = quotasByConceptId.get(quota.paymentConceptId) ?? []
      group.push(quota)
      quotasByConceptId.set(quota.paymentConceptId, group)
    }

    // 3. Per-concept validations
    let currencyId: string | null = null
    const bankAccountIdsByConceptId = new Map<string, Set<string>>()

    for (const [conceptId, conceptQuotas] of quotasByConceptId) {
      const concept = await this.conceptsRepo.getById(conceptId)
      if (!concept) {
        return failure(`Concepto de pago no encontrado: ${conceptId}`, 'NOT_FOUND')
      }

      // Currency consistency
      if (!currencyId) {
        currencyId = concept.currencyId
      } else if (concept.currencyId !== currencyId) {
        return failure('Todas las cuotas deben tener la misma moneda', 'BAD_REQUEST')
      }

      // Oldest-first rule
      const allUnpaid = await this.quotasRepo.getUnpaidByConceptAndUnit(conceptId, unitId)
      const selectedIds = new Set(conceptQuotas.map(q => q.id))

      for (const unpaid of allUnpaid) {
        if (selectedIds.has(unpaid.id)) break
        // There's an older unpaid quota not in the selection
        return failure(
          `Debe pagar la cuota más antigua primero para el concepto "${concept.name}"`,
          'BAD_REQUEST'
        )
      }

      // Per-quota amount validation
      for (const quota of conceptQuotas) {
        const amountStr = amounts[quota.id] ?? '0'
        const amount = Number(amountStr)
        const balance = Number(quota.balance)

        if (isNaN(amount) || amount <= 0) {
          return failure('El monto debe ser mayor a 0', 'BAD_REQUEST')
        }

        if (amount > balance) {
          return failure(
            `El monto (${amountStr}) excede el saldo de la cuota (${quota.balance})`,
            'BAD_REQUEST'
          )
        }

        // Partial payment check
        if (!concept.allowsPartialPayment && amount < balance) {
          return failure(
            `El concepto "${concept.name}" requiere pago completo. Monto: ${amountStr}, Balance: ${quota.balance}`,
            'BAD_REQUEST'
          )
        }

        validatedQuotas.push({
          quotaId: quota.id,
          paymentConceptId: quota.paymentConceptId,
          amount: amountStr,
          balance: quota.balance,
        })
      }

      // Collect bank accounts for this concept
      const links = await this.conceptBankAccountsRepo.listByConceptId(conceptId)
      const accountIds = new Set<string>()

      for (const link of links) {
        const account = await this.bankAccountsRepo.getById(link.bankAccountId)
        if (account && account.isActive) {
          accountIds.add(account.id)
        }
      }

      bankAccountIdsByConceptId.set(conceptId, accountIds)
    }

    // 4. Compute common bank accounts (intersection across all concepts)
    const conceptEntries = [...bankAccountIdsByConceptId.values()]
    if (conceptEntries.length === 0 || conceptEntries.some(s => s.size === 0)) {
      return failure(
        'No hay una cuenta bancaria en común para los conceptos seleccionados',
        'BAD_REQUEST'
      )
    }

    let commonIds = conceptEntries[0]!
    for (let i = 1; i < conceptEntries.length; i++) {
      commonIds = new Set([...commonIds].filter(id => conceptEntries[i]!.has(id)))
    }

    if (commonIds.size === 0) {
      return failure(
        'No hay una cuenta bancaria en común para los conceptos seleccionados',
        'BAD_REQUEST'
      )
    }

    // Fetch full bank account details for the common ones
    const commonBankAccounts: IValidatedBankAccount[] = []
    for (const id of commonIds) {
      const account = await this.bankAccountsRepo.getById(id)
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

      commonBankAccounts.push({
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

    // 5. Calculate total
    const total = validatedQuotas.reduce((sum, vq) => sum + Number(vq.amount), 0).toFixed(2)

    return success({
      validatedQuotas,
      total,
      currencyId: currencyId!,
      commonBankAccounts,
    })
  }
}
