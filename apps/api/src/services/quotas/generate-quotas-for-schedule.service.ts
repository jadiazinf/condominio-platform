import type { TUnit } from '@packages/domain'
import type {
  QuotasRepository,
  QuotaGenerationRulesRepository,
  QuotaFormulasRepository,
  QuotaGenerationLogsRepository,
  QuotaGenerationSchedulesRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { CalculateFormulaAmountService } from '../quota-formulas/calculate-formula-amount.service'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@utils/logger'

export interface IGenerateQuotasInput {
  scheduleId: string
  periodYear: number
  periodMonth: number
  generatedBy: string
}

export interface IGenerateQuotasOutput {
  quotasCreated: number
  quotasFailed: number
  totalAmount: number
  logId: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Core batch generation service.
 * Takes a schedule, finds the associated rule, formula, and units,
 * then creates quotas for each unit in scope.
 */
export class GenerateQuotasForScheduleService {
  private readonly calculateService: CalculateFormulaAmountService

  constructor(
    private readonly db: TDrizzleClient,
    private readonly quotasRepo: QuotasRepository,
    private readonly rulesRepo: QuotaGenerationRulesRepository,
    private readonly formulasRepo: QuotaFormulasRepository,
    private readonly schedulesRepo: QuotaGenerationSchedulesRepository,
    private readonly logsRepo: QuotaGenerationLogsRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly buildingsRepo: BuildingsRepository,
  ) {
    this.calculateService = new CalculateFormulaAmountService(formulasRepo, unitsRepo)
  }

  async execute(input: IGenerateQuotasInput): Promise<TServiceResult<IGenerateQuotasOutput>> {
    const { scheduleId, periodYear, periodMonth, generatedBy } = input

    // 1. Get the schedule
    const schedule = await this.schedulesRepo.getById(scheduleId)
    if (!schedule) {
      return failure('Schedule not found', 'NOT_FOUND')
    }

    // 2. Get the rule
    const rule = await this.rulesRepo.getById(schedule.quotaGenerationRuleId)
    if (!rule || !rule.isActive) {
      return failure('Generation rule not found or inactive', 'BAD_REQUEST')
    }

    // 3. Get the formula
    const formula = await this.formulasRepo.getById(rule.quotaFormulaId)
    if (!formula || !formula.isActive) {
      return failure('Formula not found or inactive', 'BAD_REQUEST')
    }

    // 4. Get units in scope
    let units: TUnit[]
    if (rule.buildingId) {
      units = await this.unitsRepo.getByBuildingId(rule.buildingId)
    } else {
      units = await this.getUnitsByCondominiumId(rule.condominiumId)
    }

    if (units.length === 0) {
      return failure('No units found in scope', 'BAD_REQUEST')
    }

    // 5. Calculate issue and due dates
    const issueDate = this.buildDate(periodYear, periodMonth, schedule.issueDay)
    const dueDate = this.buildDate(periodYear, periodMonth, schedule.dueDay)
    const periodDescription = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`

    // 6. Pre-compute amounts for all units (reads outside transaction)
    const unitsWithAmounts: { unit: TUnit; amount: string }[] = []
    let preComputeErrors: string[] = []
    let preComputeFailed = 0

    for (const unit of units) {
      try {
        const calcResult = await this.calculateService.execute({
          formulaId: formula.id,
          unitId: unit.id,
        })

        if (!calcResult.success) {
          preComputeFailed++
          preComputeErrors.push(`Unit ${unit.id}: ${calcResult.error}`)
          continue
        }

        unitsWithAmounts.push({ unit, amount: calcResult.data.amount })
      } catch (error) {
        preComputeFailed++
        const msg = error instanceof Error ? error.message : String(error)
        preComputeErrors.push(`Unit ${unit.id}: ${msg}`)
        logger.error({ unitId: unit.id, error }, '[QuotaGen] Failed to calculate amount for unit')
      }
    }

    // 7. All writes inside a transaction (with duplicate check)
    return await this.db.transaction(async (tx) => {
      const txQuotasRepo = this.quotasRepo.withTx(tx)
      const txLogsRepo = this.logsRepo.withTx(tx)

      let quotasCreated = 0
      let quotasFailed = preComputeFailed
      const errors = [...preComputeErrors]
      let totalAmount = 0
      const affectedUnitIds: string[] = []

      for (const { unit, amount } of unitsWithAmounts) {
        try {
          // Duplicate check INSIDE transaction for atomicity
          const existingQuotas = await txQuotasRepo.getByPeriod(periodYear, periodMonth)
          const alreadyExists = existingQuotas.some(
            q => q.unitId === unit.id && q.paymentConceptId === rule.paymentConceptId && q.status !== 'cancelled'
          )
          if (alreadyExists) {
            continue // Skip, already generated
          }

          await txQuotasRepo.create({
            unitId: unit.id,
            paymentConceptId: rule.paymentConceptId,
            periodYear,
            periodMonth,
            periodDescription,
            baseAmount: amount,
            currencyId: formula.currencyId,
            interestAmount: '0',
            amountInBaseCurrency: null,
            exchangeRateUsed: null,
            issueDate,
            dueDate,
            status: 'pending',
            paidAmount: '0',
            balance: amount,
            notes: null,
            metadata: null,
            createdBy: generatedBy,
          })

          quotasCreated++
          totalAmount += parseFloat(amount)
          affectedUnitIds.push(unit.id)
        } catch (error) {
          quotasFailed++
          const msg = error instanceof Error ? error.message : String(error)
          errors.push(`Unit ${unit.id}: ${msg}`)
          logger.error({ unitId: unit.id, error }, '[QuotaGen] Failed to create quota for unit')
        }
      }

      // Determine status
      const status = quotasFailed === 0
        ? 'completed' as const
        : quotasCreated > 0
          ? 'partial' as const
          : 'failed' as const

      // Create generation log
      const log = await txLogsRepo.create({
        generationRuleId: rule.id,
        generationScheduleId: schedule.id,
        quotaFormulaId: formula.id,
        generationMethod: 'scheduled',
        periodYear,
        periodMonth,
        periodDescription,
        quotasCreated,
        quotasFailed,
        totalAmount: totalAmount.toFixed(2),
        currencyId: formula.currencyId,
        unitsAffected: affectedUnitIds.length > 0 ? affectedUnitIds : null,
        parameters: {
          scheduleId: schedule.id,
          ruleId: rule.id,
          formulaId: formula.id,
          issueDate,
          dueDate,
        },
        formulaSnapshot: {
          id: formula.id,
          name: formula.name,
          formulaType: formula.formulaType,
          fixedAmount: formula.fixedAmount,
          expression: formula.expression,
        },
        status,
        errorDetails: errors.length > 0 ? errors.join('\n') : null,
        generatedBy,
      })

      return success({
        quotasCreated,
        quotasFailed,
        totalAmount,
        logId: log.id,
      })
    })
  }

  /**
   * Retrieves all active units for a condominium by querying through buildings.
   * Units belong to buildings, which belong to condominiums.
   */
  private async getUnitsByCondominiumId(condominiumId: string): Promise<TUnit[]> {
    const buildings = await this.buildingsRepo.getByCondominiumId(condominiumId)
    const allUnits: TUnit[] = []

    for (const building of buildings) {
      const buildingUnits = await this.unitsRepo.getByBuildingId(building.id)
      allUnits.push(...buildingUnits)
    }

    return allUnits
  }

  /**
   * Builds a date string clamped to the max days in the given month.
   */
  private buildDate(year: number, month: number, day: number): string {
    const maxDay = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(day, maxDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
  }
}
