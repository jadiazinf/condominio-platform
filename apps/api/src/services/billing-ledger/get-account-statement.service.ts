import type { TUnitLedgerEntry, TCharge } from '@packages/domain'
import { type TServiceResult, success } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

type TLedgerRepo = {
  getLastEntryBefore: (unitId: string, channelId: string, beforeDate: string) => Promise<TUnitLedgerEntry | null>
  getEntries: (unitId: string, channelId: string, fromDate: string, toDate: string) => Promise<TUnitLedgerEntry[]>
  getLastEntry: (unitId: string, channelId: string) => Promise<TUnitLedgerEntry | null>
}

type TChargesRepo = {
  findPendingByUnitAndChannel: (unitId: string, channelId: string) => Promise<TCharge[]>
}

export interface IAccountStatementInput {
  unitId: string
  billingChannelId: string
  fromDate: string
  toDate: string
}

export interface IStatementEntry {
  date: string
  description: string | null
  debit: string | null
  credit: string | null
  balance: string
  referenceType: string
  referenceId: string
}

export interface IAging {
  current: string
  days30: string
  days60: string
  days90Plus: string
}

export interface IAccountStatementOutput {
  unitId: string
  billingChannelId: string
  fromDate: string
  toDate: string
  initialBalance: string
  entries: IStatementEntry[]
  currentBalance: string
  totalDebits: string
  totalCredits: string
  aging: IAging
}

export class GetAccountStatementService {
  private ledgerRepo: TLedgerRepo
  private chargesRepo: TChargesRepo

  constructor(ledgerRepo: TLedgerRepo, chargesRepo: TChargesRepo) {
    this.ledgerRepo = ledgerRepo
    this.chargesRepo = chargesRepo
  }

  async execute(input: IAccountStatementInput): Promise<TServiceResult<IAccountStatementOutput>> {
    const { unitId, billingChannelId, fromDate, toDate } = input

    // Initial balance
    const initialEntry = await this.ledgerRepo.getLastEntryBefore(unitId, billingChannelId, fromDate)
    const initialBalance = initialEntry ? initialEntry.runningBalance : '0'

    // Entries in range
    const entries = await this.ledgerRepo.getEntries(unitId, billingChannelId, fromDate, toDate)

    // Current balance
    const lastEntry = await this.ledgerRepo.getLastEntry(unitId, billingChannelId)
    const currentBalance = lastEntry ? lastEntry.runningBalance : '0'

    // Totals
    let totalDebits = 0
    let totalCredits = 0

    const mappedEntries: IStatementEntry[] = entries.map(e => {
      const amount = parseAmount(e.amount)
      if (e.entryType === 'debit') totalDebits += amount
      else totalCredits += amount

      return {
        date: e.entryDate,
        description: e.description,
        debit: e.entryType === 'debit' ? e.amount : null,
        credit: e.entryType === 'credit' ? e.amount : null,
        balance: e.runningBalance,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
      }
    })

    // Aging
    const pendingCharges = await this.chargesRepo.findPendingByUnitAndChannel(unitId, billingChannelId)
    const aging = this.calculateAging(pendingCharges)

    return success({
      unitId,
      billingChannelId,
      fromDate,
      toDate,
      initialBalance,
      entries: mappedEntries,
      currentBalance,
      totalDebits: toDecimal(totalDebits),
      totalCredits: toDecimal(totalCredits),
      aging,
    })
  }

  private calculateAging(charges: TCharge[]): IAging {
    let current = 0
    let days30 = 0
    let days60 = 0
    let days90Plus = 0
    const now = new Date()

    for (const charge of charges) {
      const balance = parseAmount(charge.balance)
      const createdAt = charge.createdAt instanceof Date ? charge.createdAt : new Date(charge.createdAt)
      const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      if (daysOld <= 30) current += balance
      else if (daysOld <= 60) days30 += balance
      else if (daysOld <= 90) days60 += balance
      else days90Plus += balance
    }

    return {
      current: toDecimal(current),
      days30: toDecimal(days30),
      days60: toDecimal(days60),
      days90Plus: toDecimal(days90Plus),
    }
  }
}
