import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type { EventLogger } from '@packages/services'
import type { UnitsRepository, CondominiumsRepository } from '@packages/database'
import type { GenerateCondominiumReceiptService } from './generate-condominium-receipt.service'

interface IBulkGenerateInput {
  condominiumId: string
  periodYear: number
  periodMonth: number
  currencyId: string
  budgetId?: string | null
  generatedBy: string
}

interface IBulkGenerateResult {
  generated: number
  failed: number
  total: number
  errors: Array<{ unitId: string; unitNumber: string; error: string }>
}

export class BulkGenerateReceiptsService {
  constructor(
    private generateReceiptService: GenerateCondominiumReceiptService,
    private unitsRepo: UnitsRepository,
    private condominiumsRepo: CondominiumsRepository,
    private eventLogger?: EventLogger
  ) {}

  async execute(input: IBulkGenerateInput): Promise<TServiceResult<IBulkGenerateResult>> {
    const startTime = Date.now()
    const result = await this.executeInternal(input)
    const durationMs = Date.now() - startTime

    if (this.eventLogger) {
      if (result.success) {
        this.eventLogger.info({
          category: 'receipt',
          event: 'receipt.bulk_generated',
          action: 'bulk_generate_receipts',
          message: `Bulk receipt generation: ${result.data.generated}/${result.data.total} for ${input.periodYear}-${input.periodMonth}`,
          module: 'BulkGenerateReceiptsService',
          condominiumId: input.condominiumId,
          userId: input.generatedBy,
          metadata: {
            generated: result.data.generated,
            failed: result.data.failed,
            total: result.data.total,
            periodYear: input.periodYear,
            periodMonth: input.periodMonth,
          },
          durationMs,
        })
      } else {
        this.eventLogger.error({
          category: 'receipt',
          event: 'receipt.bulk_generation.failed',
          action: 'bulk_generate_receipts',
          message: `Bulk receipt generation failed: ${result.error}`,
          module: 'BulkGenerateReceiptsService',
          condominiumId: input.condominiumId,
          userId: input.generatedBy,
          errorCode: result.code,
          errorMessage: result.error,
          durationMs,
        })
      }
    }

    return result
  }

  private async executeInternal(
    input: IBulkGenerateInput
  ): Promise<TServiceResult<IBulkGenerateResult>> {
    // 1. Validate condominium exists
    const condominium = await this.condominiumsRepo.getById(input.condominiumId)
    if (!condominium) {
      return failure('Condominium not found', 'NOT_FOUND')
    }

    // 2. Get all units for this condominium
    const units = await this.unitsRepo.getByCondominiumId(input.condominiumId)
    if (units.length === 0) {
      return failure('No units found for this condominium', 'BAD_REQUEST')
    }

    // 3. Generate receipt for each unit
    let generated = 0
    let failed = 0
    const errors: Array<{ unitId: string; unitNumber: string; error: string }> = []

    for (const unit of units) {
      const result = await this.generateReceiptService.execute({
        condominiumId: input.condominiumId,
        unitId: unit.id,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        currencyId: input.currencyId,
        budgetId: input.budgetId,
        generatedBy: input.generatedBy,
      })

      if (result.success) {
        generated++
      } else {
        failed++
        errors.push({
          unitId: unit.id,
          unitNumber:
            ((unit as unknown as Record<string, unknown>).unitNumber as string) ?? unit.id,
          error: result.error,
        })
      }
    }

    return success({
      generated,
      failed,
      total: units.length,
      errors,
    })
  }
}
