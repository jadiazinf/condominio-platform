import type {
  CondominiumReceiptsRepository,
  QuotasRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@packages/database'
import { GenerateCondominiumReceiptService } from './generate-condominium-receipt.service'
import logger from '@packages/logger'

export interface IAutoGenerateReceiptsInput {
  /** Units that had quotas generated */
  unitIds: string[]
  /** The concept type that was just generated */
  conceptType: string
  /** Condominium the units belong to */
  condominiumId: string
  /** Period for the receipt */
  periodYear: number
  periodMonth: number
  /** Currency of the charges */
  currencyId: string
  /** Budget ID (optional) */
  budgetId?: string | null
  /** User who triggered the generation */
  generatedBy: string | null
}

export interface IAutoGenerateReceiptsResult {
  receiptsGenerated: number
  receiptIds: string[]
  /** Maps unitId → receiptId for use in notification data */
  unitReceiptMap: Map<string, string>
  /** Units where a receipt already existed (CONFLICT) */
  conflicts: string[]
  errors: Array<{ unitId: string; error: string }>
}

/**
 * Checks if the concept type triggers receipt generation, and if so,
 * generates a consolidated receipt for each unit+period.
 *
 * This is designed to be called after any quota generation flow.
 * It's safe to call for non-maintenance concepts — it will no-op.
 */
export async function autoGenerateReceipts(
  repos: {
    receiptsRepo: CondominiumReceiptsRepository
    quotasRepo: QuotasRepository
    unitsRepo: UnitsRepository
    buildingsRepo: BuildingsRepository
  },
  input: IAutoGenerateReceiptsInput
): Promise<IAutoGenerateReceiptsResult> {
  const service = new GenerateCondominiumReceiptService(
    repos.receiptsRepo,
    repos.quotasRepo,
    repos.unitsRepo,
    repos.buildingsRepo
  )

  const result: IAutoGenerateReceiptsResult = {
    receiptsGenerated: 0,
    receiptIds: [],
    unitReceiptMap: new Map(),
    conflicts: [],
    errors: [],
  }

  for (const unitId of input.unitIds) {
    try {
      const receiptResult = await service.execute({
        condominiumId: input.condominiumId,
        unitId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        currencyId: input.currencyId,
        budgetId: input.budgetId ?? null,
        generatedBy: input.generatedBy ?? 'system',
      })

      if (receiptResult.success) {
        result.receiptsGenerated++
        result.receiptIds.push(receiptResult.data.id)
        result.unitReceiptMap.set(unitId, receiptResult.data.id)
      } else {
        if (receiptResult.code === 'CONFLICT') {
          result.conflicts.push(unitId)
        } else {
          result.errors.push({ unitId, error: receiptResult.error })
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      result.errors.push({ unitId, error: msg })
      logger.error({ unitId, error: msg }, '[AutoReceipts] Failed to generate receipt for unit')
    }
  }

  if (result.receiptsGenerated > 0) {
    logger.info(
      { receiptsGenerated: result.receiptsGenerated, errorsCount: result.errors.length },
      '[AutoReceipts] Receipts auto-generated'
    )
  }

  return result
}
