import type { TUnitLedgerEntry, TLedgerEntryType, TLedgerReferenceType } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

type TLedgerRepo = {
  getLastEntry: (unitId: string, channelId: string) => Promise<TUnitLedgerEntry | null>
  appendEntry: (data: Omit<TUnitLedgerEntry, 'id' | 'createdAt'>) => Promise<TUnitLedgerEntry>
}

export interface IAppendLedgerEntryInput {
  unitId: string
  billingChannelId: string
  entryDate: string
  entryType: TLedgerEntryType
  amount: string
  currencyId: string
  description: string
  referenceType: TLedgerReferenceType
  referenceId: string
  paymentAmount?: string | null
  paymentCurrencyId?: string | null
  exchangeRateId?: string | null
  createdBy?: string | null
}

export class AppendLedgerEntryService {
  private ledgerRepo: TLedgerRepo

  constructor(ledgerRepo: TLedgerRepo) {
    this.ledgerRepo = ledgerRepo
  }

  async execute(
    input: IAppendLedgerEntryInput
  ): Promise<TServiceResult<TUnitLedgerEntry>> {
    const amount = parseAmount(input.amount)

    if (amount <= 0) {
      return failure('El monto debe ser mayor a 0', 'BAD_REQUEST')
    }

    // Get previous balance
    const lastEntry = await this.ledgerRepo.getLastEntry(
      input.unitId,
      input.billingChannelId
    )
    const previousBalance = lastEntry ? parseAmount(lastEntry.runningBalance) : 0

    // Calculate new running balance
    // debit = increases balance (unit owes more)
    // credit = decreases balance (unit paid or received credit)
    const runningBalance =
      input.entryType === 'debit'
        ? previousBalance + amount
        : previousBalance - amount

    const entry = await this.ledgerRepo.appendEntry({
      unitId: input.unitId,
      billingChannelId: input.billingChannelId,
      entryDate: input.entryDate,
      entryType: input.entryType,
      amount: toDecimal(amount),
      currencyId: input.currencyId,
      runningBalance: toDecimal(runningBalance),
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      paymentAmount: input.paymentAmount ?? null,
      paymentCurrencyId: input.paymentCurrencyId ?? null,
      exchangeRateId: input.exchangeRateId ?? null,
      createdBy: input.createdBy ?? null,
    })

    return success(entry)
  }
}
