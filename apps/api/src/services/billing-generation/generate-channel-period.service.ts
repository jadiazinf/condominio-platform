import type {
  TBillingChannel,
  TChargeType,
  TBillingReceipt,
  TCharge,
  TUnitLedgerEntry,
} from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'

// ─── Repository types ───

type TBillingChannelsRepo = {
  getById: (id: string) => Promise<TBillingChannel | null>
}

type TUnitsRepo = {
  findByCondominium: (condoId: string, opts?: { active: boolean }) => Promise<TUnit[]>
  findByBuilding: (buildingId: string, opts?: { active: boolean }) => Promise<TUnit[]>
}

type TUnit = {
  id: string
  unitNumber: string
  aliquotPercentage: string | null
  buildingId: string
  isActive: boolean
}

type TChargeTypesRepo = {
  listByChannel: (channelId: string, onlyActive?: boolean) => Promise<TChargeType[]>
}

type TReceiptsRepo = {
  findActiveByChannelAndPeriod: (channelId: string, year: number, month: number) => Promise<TBillingReceipt[]>
  create: (data: Omit<TBillingReceipt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TBillingReceipt>
}

type TChargesRepo = {
  create: (data: Omit<TCharge, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TCharge>
  update: (id: string, data: Partial<TCharge>) => Promise<TCharge | null>
}

type TLedgerRepo = {
  getLastEntry: (unitId: string, channelId: string) => Promise<TUnitLedgerEntry | null>
}

type TCondominiumsRepo = {
  getById: (id: string) => Promise<{ id: string; code: string | null; receiptNumberFormat: string | null } | null>
}

// ─── Input/Output ───

export interface IChargeAmount {
  chargeTypeId: string
  amount: string
  description?: string
  expenseId?: string
}

export interface IGenerateChannelPeriodInput {
  channelId: string
  periodYear: number
  periodMonth: number
  chargeAmounts: IChargeAmount[]
  budgetId?: string
  createdBy?: string
}

export interface IGenerateChannelPeriodOutput {
  receipts: TBillingReceipt[]
  totalGenerated: number
}

// ─── Service ───

export class GenerateChannelPeriodService {
  constructor(
    private billingChannelsRepo: TBillingChannelsRepo,
    private unitsRepo: TUnitsRepo,
    private chargeTypesRepo: TChargeTypesRepo,
    private receiptsRepo: TReceiptsRepo,
    private chargesRepo: TChargesRepo,
    private ledgerRepo: TLedgerRepo,
    private appendLedgerService: AppendLedgerEntryService,
    private condominiumsRepo: TCondominiumsRepo,
  ) {}

  async execute(
    input: IGenerateChannelPeriodInput
  ): Promise<TServiceResult<IGenerateChannelPeriodOutput>> {
    const { channelId, periodYear, periodMonth, chargeAmounts } = input

    // ── 1. Validate channel ──
    const channel = await this.billingChannelsRepo.getById(channelId)
    if (!channel) return failure('Canal no encontrado', 'NOT_FOUND')
    if (!channel.isActive) return failure('Canal inactivo', 'BAD_REQUEST')

    // ── 2. Check for existing receipts ──
    const existing = await this.receiptsRepo.findActiveByChannelAndPeriod(
      channelId, periodYear, periodMonth
    )
    if (existing.length > 0) {
      return failure('Ya existen recibos para este período. Anúlelos primero.', 'CONFLICT')
    }

    // ── 3. Get units ──
    const units = channel.buildingId
      ? await this.unitsRepo.findByBuilding(channel.buildingId, { active: true })
      : await this.unitsRepo.findByCondominium(channel.condominiumId, { active: true })

    if (units.length === 0) {
      return failure('No hay unidades activas', 'BAD_REQUEST')
    }

    // ── 4. Get charge types for validation ──
    const allChargeTypes = await this.chargeTypesRepo.listByChannel(channelId)

    // ── 5. Get condominium for receipt number ──
    const condominium = await this.condominiumsRepo.getById(channel.condominiumId)
    let receiptSeq = 0

    // ── 6. Generate per unit ──
    const receipts: TBillingReceipt[] = []

    for (const unit of units) {
      // Create charges distributed by aliquot
      const unitCharges: TCharge[] = []
      let subtotal = 0
      let reserveFundAmount = 0

      for (const ca of chargeAmounts) {
        const chargeType = allChargeTypes.find(ct => ct.id === ca.chargeTypeId)
        if (!chargeType) continue

        const unitAmount = this.distribute(
          parseAmount(ca.amount),
          unit,
          units,
          channel.distributionMethod
        )

        const charge = await this.chargesRepo.create({
          billingChannelId: channelId,
          chargeTypeId: ca.chargeTypeId,
          unitId: unit.id,
          receiptId: null,
          periodYear,
          periodMonth,
          description: ca.description || `${chargeType.name} ${this.monthName(periodMonth)} ${periodYear}`,
          amount: toDecimal(unitAmount),
          isCredit: false,
          currencyId: channel.currencyId,
          status: 'pending',
          paidAmount: '0',
          balance: toDecimal(unitAmount),
          sourceExpenseId: ca.expenseId ?? null,
          sourceChargeId: null,
          isAutoGenerated: false,
          metadata: null,
          createdBy: input.createdBy ?? null,
        })
        unitCharges.push(charge)

        if (chargeType.category === 'reserve_fund') {
          reserveFundAmount += unitAmount
        } else {
          subtotal += unitAmount
        }
      }

      // Previous balance
      const lastEntry = await this.ledgerRepo.getLastEntry(unit.id, channelId)
      const previousBalance = lastEntry ? parseAmount(lastEntry.runningBalance) : 0

      // Total
      const totalAmount = subtotal + reserveFundAmount + previousBalance

      // Receipt number
      receiptSeq++
      const receiptNumber = this.generateReceiptNumber(
        condominium?.code ?? 'XX',
        condominium?.receiptNumberFormat ?? null,
        periodYear,
        periodMonth,
        receiptSeq
      )

      // Due date
      const dueDay = Math.min(channel.dueDay ?? 28, this.daysInMonth(periodYear, periodMonth))
      const dueDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`

      // Create receipt
      const receipt = await this.receiptsRepo.create({
        billingChannelId: channelId,
        unitId: unit.id,
        periodYear,
        periodMonth,
        receiptNumber,
        status: 'issued',
        issuedAt: new Date(),
        dueDate,
        subtotal: toDecimal(subtotal),
        reserveFundAmount: toDecimal(reserveFundAmount),
        previousBalance: toDecimal(previousBalance),
        interestAmount: '0',
        lateFeeAmount: '0',
        discountAmount: '0',
        totalAmount: toDecimal(totalAmount),
        currencyId: channel.currencyId,
        replacesReceiptId: null,
        voidReason: null,
        budgetId: input.budgetId ?? null,
        pdfUrl: null,
        notes: null,
        metadata: null,
        generatedBy: input.createdBy ?? null,
      })

      // Assign receiptId to charges
      for (const charge of unitCharges) {
        await this.chargesRepo.update(charge.id, { receiptId: receipt.id })
      }

      // Create ledger entries
      for (const charge of unitCharges) {
        await this.appendLedgerService.execute({
          unitId: unit.id,
          billingChannelId: channelId,
          entryDate: new Date().toISOString().split('T')[0]!,
          entryType: 'debit',
          amount: charge.amount,
          currencyId: channel.currencyId,
          description: charge.description ?? '',
          referenceType: 'charge',
          referenceId: charge.id,
          createdBy: input.createdBy ?? null,
        })
      }

      receipts.push(receipt)
    }

    return success({ receipts, totalGenerated: receipts.length })
  }

  private distribute(
    totalAmount: number,
    unit: TUnit,
    allUnits: TUnit[],
    method: string
  ): number {
    switch (method) {
      case 'by_aliquot': {
        const aliquot = parseFloat(unit.aliquotPercentage ?? '0')
        return roundCurrency(totalAmount * (aliquot / 100))
      }
      case 'equal_split':
        return roundCurrency(totalAmount / allUnits.length)
      case 'fixed_per_unit':
        return totalAmount
      default:
        return roundCurrency(totalAmount * (parseFloat(unit.aliquotPercentage ?? '0') / 100))
    }
  }

  private generateReceiptNumber(
    code: string,
    format: string | null,
    year: number,
    month: number,
    seq: number
  ): string {
    if (format) {
      return format
        .replace('{CODE}', code)
        .replace('{YYYY}', String(year))
        .replace('{YY}', String(year).slice(-2))
        .replace('{MM}', String(month).padStart(2, '0'))
        .replace(/\{SEQ:(\d+)\}/g, (_, digits) => String(seq).padStart(parseInt(digits), '0'))
        .replace('{SEQ}', String(seq))
    }
    const ym = `${year}${String(month).padStart(2, '0')}`
    return `REC-${code}-${ym}-${String(seq).padStart(4, '0')}`
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
  }

  private monthName(month: number): string {
    const names = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return names[month] ?? ''
  }
}
