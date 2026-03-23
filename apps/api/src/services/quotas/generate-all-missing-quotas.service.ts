import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { GenerateMissingQuotaService } from './generate-missing-quota.service'

type TUnitsRepo = {
  getByCondominiumId: (condominiumId: string) => Promise<unknown[]>
  getByBuildingId: (buildingId: string) => Promise<unknown[]>
  getById: (id: string) => Promise<unknown | null>
}

export interface IGenerateAllMissingQuotasInput {
  unitId: string
  paymentConceptId: string
  periodYear: number
  generatedBy: string
}

export interface IGenerateAllMissingQuotasResult {
  created: TQuota[]
  skipped: Array<{ month: number; reason: string }>
  failed: Array<{ month: number; error: string }>
}

/**
 * Generates all missing quotas for a specific concept + unit + year.
 * Respects the concept's recurrence period (monthly, quarterly, yearly)
 * and effectiveFrom/effectiveUntil dates.
 */
export class GenerateAllMissingQuotasService {
  private readonly generateOne: GenerateMissingQuotaService

  constructor(
    private readonly db: TDrizzleClient,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly unitsRepo: TUnitsRepo,
    private readonly quotasRepo: QuotasRepository
  ) {
    this.generateOne = new GenerateMissingQuotaService(
      db,
      conceptsRepo,
      assignmentsRepo,
      unitsRepo as never,
      quotasRepo
    )
  }

  async execute(
    input: IGenerateAllMissingQuotasInput
  ): Promise<TServiceResult<IGenerateAllMissingQuotasResult>> {
    const { unitId, paymentConceptId, periodYear, generatedBy } = input

    // 1. Validate concept to determine which months apply
    const concept = await this.conceptsRepo.getById(paymentConceptId)
    if (!concept) return failure('Concepto de pago no encontrado', 'NOT_FOUND')
    if (!concept.isActive) return failure('El concepto de pago está inactivo', 'BAD_REQUEST')

    // 2. Determine applicable months based on recurrence
    const months = this.getApplicableMonths(
      concept.recurrencePeriod ?? 'monthly',
      periodYear,
      concept.effectiveFrom ? new Date(concept.effectiveFrom) : null,
      concept.effectiveUntil ? new Date(concept.effectiveUntil) : null
    )

    if (months.length === 0) {
      return failure(
        'No hay periodos aplicables para este año según la configuración del concepto',
        'BAD_REQUEST'
      )
    }

    // 3. Generate quota for each applicable month
    const result: IGenerateAllMissingQuotasResult = {
      created: [],
      skipped: [],
      failed: [],
    }

    for (const month of months) {
      const genResult = await this.generateOne.execute({
        unitId,
        paymentConceptId,
        periodYear,
        periodMonth: month,
        generatedBy,
      })

      if (genResult.success) {
        result.created.push(genResult.data.quota)
      } else if (genResult.code === 'CONFLICT') {
        result.skipped.push({ month, reason: genResult.error })
      } else {
        result.failed.push({ month, error: genResult.error })
      }
    }

    return success(result)
  }

  /**
   * Returns the months that should have quotas for the given year,
   * based on recurrence period and effective dates.
   *
   * Uses same dynamic calculation as the auto-generation worker:
   * iterates from effectiveFrom by monthStep, collecting months that fall
   * within the requested year and before effectiveUntil.
   */
  private getApplicableMonths(
    recurrencePeriod: string,
    year: number,
    effectiveFrom: Date | null,
    effectiveUntil: Date | null
  ): number[] {
    const monthStep = recurrencePeriod === 'quarterly' ? 3 : recurrencePeriod === 'yearly' ? 12 : 1

    // If no effectiveFrom, assume January of the requested year
    const startYear = effectiveFrom ? effectiveFrom.getUTCFullYear() : year
    const startMonth = effectiveFrom ? effectiveFrom.getUTCMonth() + 1 : 1

    // Cap at effectiveUntil or end of requested year
    let endYear = year
    let endMonth = 12
    if (effectiveUntil) {
      const untilYear = effectiveUntil.getUTCFullYear()
      const untilMonth = effectiveUntil.getUTCMonth() + 1
      if (untilYear < endYear || (untilYear === endYear && untilMonth < endMonth)) {
        endYear = untilYear
        endMonth = untilMonth
      }
    }

    const months: number[] = []
    let iterYear = startYear
    let iterMonth = startMonth

    while (iterYear < endYear || (iterYear === endYear && iterMonth <= endMonth)) {
      // Only collect months that fall within the requested year
      if (iterYear === year) {
        months.push(iterMonth)
      }

      // If we've passed the requested year, stop
      if (iterYear > year) break

      iterMonth += monthStep
      if (iterMonth > 12) {
        iterYear += Math.floor((iterMonth - 1) / 12)
        iterMonth = ((iterMonth - 1) % 12) + 1
      }
    }

    return months
  }
}
