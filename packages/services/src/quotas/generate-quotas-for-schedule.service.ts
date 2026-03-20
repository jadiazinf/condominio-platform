import type { TUnit, TServiceExecutionCreate } from '../../../domain/src'
import type {
  QuotasRepository,
  QuotaGenerationRulesRepository,
  QuotaFormulasRepository,
  QuotaGenerationLogsRepository,
  QuotaGenerationSchedulesRepository,
  UnitsRepository,
  BuildingsRepository,
  ServiceExecutionsRepository,
} from '../../../database/src/repositories'
import type { TDrizzleClient } from '../../../database/src/repositories/interfaces'
import { CalculateFormulaAmountService } from './calculate-formula-amount.service'
import { type TServiceResult, success, failure } from '../base'
import { parseAmount, toDecimal } from '../../../utils/src/money'
import logger from '../../../logger/src'

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
  affectedUnitIds: string[]
  paymentConceptId: string
  periodDescription: string
  dueDate: string
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

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
    private readonly executionsRepo?: ServiceExecutionsRepository
  ) {
    this.calculateService = new CalculateFormulaAmountService(formulasRepo, unitsRepo)
  }

  async execute(input: IGenerateQuotasInput): Promise<TServiceResult<IGenerateQuotasOutput>> {
    const { scheduleId, periodYear, periodMonth, generatedBy } = input

    const schedule = await this.schedulesRepo.getById(scheduleId)
    if (!schedule) {
      return failure('Schedule not found', 'NOT_FOUND')
    }

    const rule = await this.rulesRepo.getById(schedule.quotaGenerationRuleId)
    if (!rule || !rule.isActive) {
      return failure('Generation rule not found or inactive', 'BAD_REQUEST')
    }

    const formula = await this.formulasRepo.getById(rule.quotaFormulaId)
    if (!formula || !formula.isActive) {
      return failure('Formula not found or inactive', 'BAD_REQUEST')
    }

    let units: TUnit[]
    if (rule.buildingId) {
      units = await this.unitsRepo.getByBuildingId(rule.buildingId)
    } else {
      units = await this.getUnitsByCondominiumId(rule.condominiumId)
    }

    if (units.length === 0) {
      return failure('No units found in scope', 'BAD_REQUEST')
    }

    const issueDate = this.buildDate(periodYear, periodMonth, schedule.issueDay)
    const dueDate = this.buildDate(periodYear, periodMonth, schedule.dueDay)
    const today = new Date().toISOString().split('T')[0]!
    const quotaStatus = dueDate < today ? 'overdue' : 'pending'
    const periodDescription = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`

    const unitsWithAmounts: { unit: TUnit; amount: string }[] = []
    const preComputeErrors: string[] = []
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

    return await this.db.transaction(async tx => {
      const txQuotasRepo = this.quotasRepo.withTx(tx)
      const txLogsRepo = this.logsRepo.withTx(tx)

      let quotasCreated = 0
      let quotasFailed = preComputeFailed
      const errors = [...preComputeErrors]
      let totalAmount = 0
      const affectedUnitIds: string[] = []

      // Pre-check which units already have quotas for this period/concept (avoid N+1)
      const existingQuotas = await txQuotasRepo.getByPeriod(periodYear, periodMonth)
      const existingUnitIds = new Set(
        existingQuotas
          .filter(
            q =>
              q.paymentConceptId === rule.paymentConceptId &&
              q.status !== 'cancelled' &&
              q.status !== 'exonerated'
          )
          .map(q => q.unitId)
      )

      for (const { unit, amount } of unitsWithAmounts) {
        try {
          if (existingUnitIds.has(unit.id)) {
            continue
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
            status: quotaStatus,
            adjustmentsTotal: '0',
            paidAmount: '0',
            balance: amount,
            notes: null,
            metadata: null,
            createdBy: generatedBy,
          })

          quotasCreated++
          totalAmount += parseAmount(amount)
          affectedUnitIds.push(unit.id)
        } catch (error) {
          quotasFailed++
          const msg = error instanceof Error ? error.message : String(error)
          errors.push(`Unit ${unit.id}: ${msg}`)
          logger.error({ unitId: unit.id, error }, '[QuotaGen] Failed to create quota for unit')
        }
      }

      // Clone template executions for this period (if any)
      if (quotasCreated > 0 && this.executionsRepo) {
        try {
          const templates = await this.executionsRepo.getTemplatesByConceptId(rule.paymentConceptId)

          if (templates.length > 0) {
            const txExecutionsRepo = this.executionsRepo.withTx(tx)

            for (const template of templates) {
              const clonedDate = template.executionDay
                ? this.buildDate(periodYear, periodMonth, template.executionDay)
                : issueDate

              await txExecutionsRepo.create({
                serviceId: template.serviceId,
                condominiumId: template.condominiumId,
                paymentConceptId: template.paymentConceptId,
                title: `${template.title} - ${periodDescription}`,
                description: template.description ?? undefined,
                executionDate: clonedDate,
                executionDay: null,
                isTemplate: false,
                totalAmount: template.totalAmount,
                currencyId: template.currencyId,
                invoiceNumber: template.invoiceNumber ?? undefined,
                items: template.items,
                attachments: template.attachments as TServiceExecutionCreate['attachments'],
                notes: template.notes ?? undefined,
              })
            }

            logger.info(
              {
                conceptId: rule.paymentConceptId,
                templates: templates.length,
                period: periodDescription,
              },
              '[QuotaGen] Cloned template executions for period'
            )
          }
        } catch (error) {
          logger.error(
            { error, conceptId: rule.paymentConceptId },
            '[QuotaGen] Failed to clone template executions'
          )
        }
      }

      const status =
        quotasFailed === 0
          ? ('completed' as const)
          : quotasCreated > 0
            ? ('partial' as const)
            : ('failed' as const)

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
        totalAmount: toDecimal(totalAmount),
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
        affectedUnitIds,
        paymentConceptId: rule.paymentConceptId,
        periodDescription,
        dueDate,
      })
    })
  }

  private async getUnitsByCondominiumId(condominiumId: string): Promise<TUnit[]> {
    const buildings = await this.buildingsRepo.getByCondominiumId(condominiumId)
    const allUnits: TUnit[] = []

    for (const building of buildings) {
      const buildingUnits = await this.unitsRepo.getByBuildingId(building.id)
      allUnits.push(...buildingUnits)
    }

    return allUnits
  }

  private buildDate(year: number, month: number, day: number): string {
    const maxDay = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(day, maxDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
  }
}
