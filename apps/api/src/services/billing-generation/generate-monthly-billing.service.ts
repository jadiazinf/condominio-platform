import type {
  TChargeType,
  TChargeCategory,
  TBillingReceipt,
  TCharge,
  TUnitLedgerEntry,
} from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'

// ─── Repository types ───

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
  listByCondominium: (condominiumId: string, onlyActive?: boolean) => Promise<TChargeType[]>
}

type TChargeCategoriesRepo = {
  listAllActive: () => Promise<TChargeCategory[]>
}

type TReceiptsRepo = {
  findActiveByCondominiumAndPeriod: (condominiumId: string, year: number, month: number) => Promise<TBillingReceipt[]>
  getById: (id: string) => Promise<TBillingReceipt | null>
  create: (data: Omit<TBillingReceipt, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TBillingReceipt>
}

type TChargesRepo = {
  create: (data: Omit<TCharge, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TCharge>
  update: (id: string, data: Partial<TCharge>) => Promise<TCharge | null>
}

type TLedgerRepo = {
  getLastEntry: (unitId: string, condominiumId: string) => Promise<TUnitLedgerEntry | null>
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

export interface IGenerateMonthlyBillingInput {
  condominiumId: string
  buildingId?: string | null
  periodYear: number
  periodMonth: number
  dueDay: number
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  currencyId: string
  chargeAmounts: IChargeAmount[]
  budgetId?: string
  createdBy?: string
  /** When set, generates a complementary receipt linked to the parent */
  parentReceiptId?: string
  /** When set with parentReceiptId, scopes generation to a single unit */
  unitId?: string
  /** Optional reference to an assembly minute for legal backing */
  assemblyMinuteId?: string
}

export interface IGenerateMonthlyBillingOutput {
  receipts: TBillingReceipt[]
  totalGenerated: number
  warnings?: string[]
}

// ─── Service ───

export class GenerateMonthlyBillingService {
  constructor(
    private unitsRepo: TUnitsRepo,
    private chargeTypesRepo: TChargeTypesRepo,
    private receiptsRepo: TReceiptsRepo,
    private chargesRepo: TChargesRepo,
    private ledgerRepo: TLedgerRepo,
    private appendLedgerService: AppendLedgerEntryService,
    private condominiumsRepo: TCondominiumsRepo,
    private chargeCategoriesRepo?: TChargeCategoriesRepo,
  ) {}

  async execute(
    input: IGenerateMonthlyBillingInput
  ): Promise<TServiceResult<IGenerateMonthlyBillingOutput>> {
    const {
      condominiumId, buildingId, periodYear, periodMonth,
      chargeAmounts, dueDay, distributionMethod, currencyId,
      parentReceiptId, unitId: inputUnitId,
    } = input

    const isComplementary = !!parentReceiptId
    const warnings: string[] = []

    // ── 1. Check for existing receipts (skip for complementary) ──
    if (!isComplementary) {
      const existing = await this.receiptsRepo.findActiveByCondominiumAndPeriod(
        condominiumId, periodYear, periodMonth
      )
      if (existing.length > 0) {
        return failure('Ya existen recibos para este período. Anúlelos primero.', 'CONFLICT')
      }
    }

    // ── 1b. Validate parent receipt exists for complementary ──
    let parentUnitId: string | undefined
    if (isComplementary) {
      const parentReceipt = await this.receiptsRepo.getById(parentReceiptId)
      if (!parentReceipt) {
        return failure('Recibo padre no encontrado', 'NOT_FOUND')
      }
      if (parentReceipt.status === 'voided') {
        return failure('No se puede crear complementario de un recibo anulado', 'BAD_REQUEST')
      }
      parentUnitId = parentReceipt.unitId
    }

    // ── 2. Get units ──
    const targetUnitId = inputUnitId ?? parentUnitId
    let units: TUnit[]

    if (targetUnitId) {
      // Single-unit generation (complementary or explicit unitId)
      const allUnits = buildingId
        ? await this.unitsRepo.findByBuilding(buildingId, { active: true })
        : await this.unitsRepo.findByCondominium(condominiumId, { active: true })
      const targetUnit = allUnits.find(u => u.id === targetUnitId)
      if (!targetUnit) {
        return failure('Unidad no encontrada o inactiva', 'NOT_FOUND')
      }
      units = [targetUnit]
    } else {
      units = buildingId
        ? await this.unitsRepo.findByBuilding(buildingId, { active: true })
        : await this.unitsRepo.findByCondominium(condominiumId, { active: true })
    }

    if (units.length === 0) {
      return failure('No hay unidades activas', 'BAD_REQUEST')
    }

    // ── 3. Get charge types for validation ──
    const allChargeTypes = await this.chargeTypesRepo.listByCondominium(condominiumId)

    // Build category ID → name lookup
    const categories = this.chargeCategoriesRepo ? await this.chargeCategoriesRepo.listAllActive() : []
    const catNameMap = new Map(categories.map(c => [c.id, c.name]))

    // ── 3b. Feature 3: Warn if extraordinary charges lack assembly backing ──
    const hasExtraordinary = chargeAmounts.some(ca => {
      const ct = allChargeTypes.find(t => t.id === ca.chargeTypeId)
      return ct && catNameMap.get(ct.categoryId) === 'extraordinary'
    })
    if (hasExtraordinary && !input.assemblyMinuteId) {
      warnings.push('Se están generando cargos extraordinarios sin referencia a un acta de asamblea. Se recomienda asociar un acta para respaldo legal.')
    }

    // ── 4. Get condominium for receipt number ──
    const condominium = await this.condominiumsRepo.getById(condominiumId)
    let receiptSeq = 0

    // ── 5. Generate per unit ──
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
          distributionMethod
        )

        const charge = await this.chargesRepo.create({
          condominiumId,
          chargeTypeId: ca.chargeTypeId,
          unitId: unit.id,
          receiptId: null,
          periodYear,
          periodMonth,
          description: ca.description || `${chargeType.name} ${this.monthName(periodMonth)} ${periodYear}`,
          amount: toDecimal(unitAmount),
          isCredit: false,
          currencyId,
          status: 'pending',
          paidAmount: '0',
          balance: toDecimal(unitAmount),
          distributionMethod,
          sourceExpenseId: ca.expenseId ?? null,
          sourceChargeId: null,
          sourceReceiptId: null,
          isAutoGenerated: false,
          metadata: null,
          createdBy: input.createdBy ?? null,
        })
        unitCharges.push(charge)

        if (catNameMap.get(chargeType.categoryId) === 'reserve_fund') {
          reserveFundAmount += unitAmount
        } else {
          subtotal += unitAmount
        }
      }

      // Previous balance
      const lastEntry = await this.ledgerRepo.getLastEntry(unit.id, condominiumId)
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
      const effectiveDueDay = Math.min(dueDay, this.daysInMonth(periodYear, periodMonth))
      const dueDate = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(effectiveDueDay).padStart(2, '0')}`

      // Create receipt
      const receipt = await this.receiptsRepo.create({
        condominiumId,
        unitId: unit.id,
        periodYear,
        periodMonth,
        receiptNumber,
        receiptType: isComplementary ? 'complementary' : 'original',
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
        currencyId,
        parentReceiptId: parentReceiptId ?? null,
        replacesReceiptId: null,
        voidReason: null,
        assemblyMinuteId: input.assemblyMinuteId ?? null,
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
          condominiumId,
          entryDate: new Date().toISOString().split('T')[0]!,
          entryType: 'debit',
          amount: charge.amount,
          currencyId,
          description: charge.description ?? '',
          referenceType: 'charge',
          referenceId: charge.id,
          createdBy: input.createdBy ?? null,
        })
      }

      receipts.push(receipt)
    }

    return success({
      receipts,
      totalGenerated: receipts.length,
      ...(warnings.length > 0 ? { warnings } : {}),
    })
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
