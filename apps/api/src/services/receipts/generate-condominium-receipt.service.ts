import type { TCondominiumReceipt } from '@packages/domain'
import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type { CondominiumReceiptsRepository } from '@packages/database'
import type { QuotasRepository } from '@packages/database'
import type { UnitsRepository } from '@packages/database'
import type { BuildingsRepository } from '@packages/database'

interface IGenerateReceiptInput {
  condominiumId: string
  unitId: string
  periodYear: number
  periodMonth: number
  currencyId: string
  budgetId?: string | null
  generatedBy: string
}

// Concept type mapping from payment concept types to receipt categories
const CONCEPT_TYPE_MAP: Record<string, string> = {
  condominium_fee: 'ordinary',
  maintenance: 'ordinary',
  extraordinary: 'extraordinary',
  reserve_fund: 'reserve_fund',
  fine: 'fine',
  other: 'ordinary',
}

export class GenerateCondominiumReceiptService {
  constructor(
    private receiptsRepo: CondominiumReceiptsRepository,
    private quotasRepo: QuotasRepository,
    private unitsRepo: UnitsRepository,
    private buildingsRepo: BuildingsRepository
  ) {}

  async execute(input: IGenerateReceiptInput): Promise<TServiceResult<TCondominiumReceipt>> {
    // 1. Check if receipt already exists (allow regeneration of voided receipts)
    const existing = await this.receiptsRepo.getByUnitAndPeriod(
      input.unitId,
      input.periodYear,
      input.periodMonth
    )

    if (existing && existing.status !== 'voided') {
      return failure('Receipt already exists for this unit and period', 'CONFLICT')
    }

    // 2. Get unit info
    const unit = await this.unitsRepo.getById(input.unitId)
    if (!unit) {
      return failure('Unit not found', 'NOT_FOUND')
    }

    // 3. Get building info
    const _building = await this.buildingsRepo.getById(unit.buildingId)

    // 4. Get quotas for this unit+period
    const quotas = await this.quotasRepo.getByUnitAndPeriod(
      input.unitId,
      input.periodYear,
      input.periodMonth
    )

    if (quotas.length === 0) {
      return failure('No quotas found for this unit and period', 'BAD_REQUEST')
    }

    // 5. Calculate amounts by category
    let ordinaryAmount = 0
    let extraordinaryAmount = 0
    let reserveFundAmount = 0
    let interestAmount = 0
    let finesAmount = 0

    for (const quota of quotas) {
      const conceptType = quota.paymentConcept?.conceptType ?? 'other'
      const category = CONCEPT_TYPE_MAP[conceptType] ?? 'ordinary'
      const amount = parseFloat(quota.baseAmount) || 0
      const interest = parseFloat(quota.interestAmount) || 0

      interestAmount += interest

      switch (category) {
        case 'ordinary':
          ordinaryAmount += amount
          break
        case 'extraordinary':
          extraordinaryAmount += amount
          break
        case 'reserve_fund':
          reserveFundAmount += amount
          break
        case 'fine':
          finesAmount += amount
          break
      }
    }

    // 6. Calculate previous balance (unpaid quotas from prior periods)
    const pendingQuotas = await this.quotasRepo.getPendingByUnit(input.unitId)
    let previousBalance = 0
    for (const pq of pendingQuotas) {
      // Only count quotas from before this period
      if (
        pq.periodYear < input.periodYear ||
        (pq.periodYear === input.periodYear && pq.periodMonth < input.periodMonth)
      ) {
        previousBalance += parseFloat(pq.balance) || 0
      }
    }

    // 7. Calculate total
    const totalAmount =
      ordinaryAmount +
      extraordinaryAmount +
      reserveFundAmount +
      interestAmount +
      finesAmount +
      previousBalance

    // 8. Generate receipt number
    const existingReceipts = await this.receiptsRepo.getByCondominiumAndPeriod(
      input.condominiumId,
      input.periodYear,
      input.periodMonth
    )
    const seq = (existingReceipts.length + 1).toString().padStart(4, '0')
    const monthStr = input.periodMonth.toString().padStart(2, '0')
    const receiptNumber = `REC-${input.periodYear}${monthStr}-${seq}`

    // 9. Create receipt
    const receipt = await this.receiptsRepo.create({
      condominiumId: input.condominiumId,
      buildingId: unit.buildingId,
      unitId: input.unitId,
      budgetId: input.budgetId ?? null,
      currencyId: input.currencyId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      receiptNumber,
      status: 'generated',
      ordinaryAmount: ordinaryAmount.toFixed(2),
      extraordinaryAmount: extraordinaryAmount.toFixed(2),
      reserveFundAmount: reserveFundAmount.toFixed(2),
      interestAmount: interestAmount.toFixed(2),
      finesAmount: finesAmount.toFixed(2),
      previousBalance: previousBalance.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      unitAliquot:
        ((unit as unknown as Record<string, unknown>).aliquotPercentage as string) ?? null,
      generatedAt: new Date(),
      generatedBy: input.generatedBy,
      notes: null,
      metadata: null,
    })

    return success(receipt)
  }
}
