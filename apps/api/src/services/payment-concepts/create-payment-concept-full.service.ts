import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TServiceExecutionCreate,
  TCalculationPeriod,
} from '@packages/domain'
import type {
  PaymentConceptsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  PaymentConceptServicesRepository,
  ServiceExecutionsRepository,
  PaymentConceptAssignmentsRepository,
  PaymentConceptBankAccountsRepository,
  InterestConfigurationsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { GenerateChargesService } from './generate-charges.service'
import {
  enqueueBulkGeneration,
  enqueueAutoGeneration,
  enqueueNotification,
} from '@src/queue/boss-client'
import { WebSocketManager } from '@src/libs/websocket/websocket-manager'
import logger from '@utils/logger'

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

type TCondominiumServicesRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; name: string } | null>
}

export interface IServiceWithExecution {
  serviceId: string
  amount: number
  useDefaultAmount: boolean
  execution: {
    title: string
    description?: string
    executionDate?: string | null
    executionDay?: number | null
    isTemplate?: boolean
    totalAmount: string
    currencyId: string
    invoiceNumber?: string
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      amount: number
      notes?: string
    }>
    attachments: Array<{
      name: string
      url: string
      mimeType: string
      size: number
      storagePath?: string
    }>
    notes?: string
  }
}

export interface IAssignmentInput {
  scopeType: 'condominium' | 'building' | 'unit'
  condominiumId: string
  buildingId?: string
  unitId?: string
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
}

export interface IInterestConfigInput {
  name: string
  interestType: 'simple' | 'compound' | 'fixed_amount'
  interestRate?: number
  calculationPeriod?: string
  gracePeriodDays?: number
  isActive?: boolean
  effectiveFrom: string
}

export interface ICreatePaymentConceptFullInput extends TPaymentConceptCreate {
  managementCompanyId: string
  createdBy: string
  services?: IServiceWithExecution[]
  assignments?: IAssignmentInput[]
  bankAccountIds?: string[]
  interestConfig?: IInterestConfigInput
  notifyImmediately?: boolean
}

type TUnitsRepo = {
  getByCondominiumId: (
    condominiumId: string
  ) => Promise<
    Array<{ id: string; buildingId: string; aliquotPercentage: string | null; isActive: boolean }>
  >
  getByBuildingId: (
    buildingId: string
  ) => Promise<
    Array<{ id: string; buildingId: string; aliquotPercentage: string | null; isActive: boolean }>
  >
  getById: (id: string) => Promise<{
    id: string
    buildingId: string
    aliquotPercentage: string | null
    isActive: boolean
  } | null>
}

type TQuotasRepo = {
  existsForConceptAndPeriod: (conceptId: string, year: number, month: number) => Promise<boolean>
  createMany: (quotas: Record<string, unknown>[]) => Promise<{ id: string }[]>
  withTx: (tx: TDrizzleClient) => TQuotasRepo
}

type TUnitOwnershipsRepo = {
  getRegisteredByUnitIds: (
    unitIds: string[]
  ) => Promise<Array<{ userId: string | null; unitId: string }>>
}

export class CreatePaymentConceptFullService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly paymentConceptsRepo: PaymentConceptsRepository,
    private readonly condominiumsRepo: CondominiumsRepository,
    private readonly currenciesRepo: CurrenciesRepository,
    private readonly condominiumMCRepo: TCondominiumMCRepo,
    private readonly conceptServicesRepo: PaymentConceptServicesRepository,
    private readonly condominiumServicesRepo: TCondominiumServicesRepo,
    private readonly executionsRepo: ServiceExecutionsRepository,
    private readonly assignmentsRepo?: PaymentConceptAssignmentsRepository,
    private readonly conceptBankAccountsRepo?: PaymentConceptBankAccountsRepository,
    private readonly interestConfigsRepo?: InterestConfigurationsRepository,
    private readonly unitsRepo?: TUnitsRepo,
    private readonly quotasRepo?: TQuotasRepo,
    private readonly unitOwnershipsRepo?: TUnitOwnershipsRepo
  ) {}

  async execute(input: ICreatePaymentConceptFullInput): Promise<TServiceResult<TPaymentConcept>> {
    // ── Pre-transaction validations ────────────────────────────────────────

    if (!input.name || input.name.trim().length === 0) {
      return failure('Name is required', 'BAD_REQUEST')
    }

    if (!input.condominiumId) {
      return failure('Condominium ID is required', 'BAD_REQUEST')
    }

    if (input.conceptType === 'maintenance' && (!input.services || input.services.length === 0)) {
      return failure('SERVICES_REQUIRED', 'BAD_REQUEST')
    }

    // Validate scheduling for recurring concepts
    if (input.isRecurring) {
      if (!input.recurrencePeriod)
        return failure('Recurrence period is required for recurring concepts', 'BAD_REQUEST')
      if (input.issueDay == null)
        return failure('Issue day is required for recurring concepts', 'BAD_REQUEST')
      if (input.dueDay == null)
        return failure('Due day is required for recurring concepts', 'BAD_REQUEST')
    }

    // Validate bulk generation strategy requirements
    const strategy = input.chargeGenerationStrategy ?? 'auto'
    if (input.isRecurring && strategy === 'bulk') {
      if (!input.effectiveFrom)
        return failure('Start date is required for bulk generation', 'BAD_REQUEST')
      if (!input.effectiveUntil)
        return failure('End date is required for bulk generation', 'BAD_REQUEST')
      const from = new Date(input.effectiveFrom)
      const until = new Date(input.effectiveUntil)
      if (until <= from) return failure('End date must be after start date', 'BAD_REQUEST')
      const monthsDiff =
        (until.getUTCFullYear() - from.getUTCFullYear()) * 12 +
        (until.getUTCMonth() - from.getUTCMonth())
      if (monthsDiff > 12) return failure('Bulk generation is limited to 12 months', 'BAD_REQUEST')
    }

    if (input.issueDay != null && (input.issueDay < 1 || input.issueDay > 28)) {
      return failure('Issue day must be between 1 and 28', 'BAD_REQUEST')
    }
    if (input.dueDay != null && (input.dueDay < 1 || input.dueDay > 28)) {
      return failure('Due day must be between 1 and 28', 'BAD_REQUEST')
    }

    // Validate late payment config
    if (input.latePaymentType !== 'none') {
      if (input.latePaymentValue == null || input.latePaymentValue <= 0) {
        return failure('Late payment value must be greater than 0', 'BAD_REQUEST')
      }
      if (input.latePaymentType === 'percentage' && input.latePaymentValue > 100) {
        return failure('Late payment percentage cannot exceed 100%', 'BAD_REQUEST')
      }
    }

    // Validate early payment config
    if (input.earlyPaymentType !== 'none') {
      if (input.earlyPaymentValue == null || input.earlyPaymentValue <= 0) {
        return failure('Early payment value must be greater than 0', 'BAD_REQUEST')
      }
      if (input.earlyPaymentDaysBeforeDue <= 0) {
        return failure(
          'Days before due must be greater than 0 for early payment discounts',
          'BAD_REQUEST'
        )
      }
      if (input.earlyPaymentType === 'percentage' && input.earlyPaymentValue > 100) {
        return failure('Early payment percentage cannot exceed 100%', 'BAD_REQUEST')
      }
    }

    // Validate condominium exists
    const condominium = await this.condominiumsRepo.getById(input.condominiumId)
    if (!condominium) {
      return failure('CONDOMINIUM_NOT_FOUND', 'NOT_FOUND')
    }

    // Validate condominium belongs to MC
    const condominiumMC = await this.condominiumMCRepo.getByCondominiumAndMC(
      input.condominiumId,
      input.managementCompanyId
    )
    if (!condominiumMC) {
      return failure('CONDOMINIUM_NOT_IN_COMPANY', 'NOT_FOUND')
    }

    // Validate concept currency exists
    const currency = await this.currenciesRepo.getById(input.currencyId)
    if (!currency) {
      return failure('CURRENCY_NOT_FOUND', 'NOT_FOUND')
    }

    // Validate all services exist
    const services = input.services ?? []
    for (const svc of services) {
      const service = await this.condominiumServicesRepo.getById(svc.serviceId)
      if (!service) {
        return failure('SERVICE_NOT_FOUND', 'NOT_FOUND')
      }
    }

    // Validate all execution currencies exist and match concept currency
    for (const svc of services) {
      const execCurrency = await this.currenciesRepo.getById(svc.execution.currencyId)
      if (!execCurrency) {
        return failure('EXECUTION_CURRENCY_NOT_FOUND', 'NOT_FOUND')
      }
      if (svc.execution.currencyId !== input.currencyId) {
        return failure('CURRENCY_MISMATCH', 'BAD_REQUEST')
      }
    }

    const assignments = input.assignments ?? []
    const bankAccountIds = input.bankAccountIds ?? []

    // ── Transaction: create all resources atomically ─────────────────────

    const result = await this.db.transaction(async tx => {
      const txConceptsRepo = this.paymentConceptsRepo.withTx(tx)
      const txConceptServicesRepo = this.conceptServicesRepo.withTx(tx)
      const txExecutionsRepo = this.executionsRepo.withTx(tx)

      // 1. Create payment concept
      const concept = await txConceptsRepo.create(input)

      // 2. Link services + create executions
      for (const svc of services) {
        await txConceptServicesRepo.linkService(
          concept.id,
          svc.serviceId,
          svc.amount,
          svc.useDefaultAmount
        )

        await txExecutionsRepo.create({
          serviceId: svc.serviceId,
          condominiumId: input.condominiumId!,
          paymentConceptId: concept.id,
          title: svc.execution.title,
          description: svc.execution.description,
          executionDate: svc.execution.executionDate ?? null,
          executionDay: svc.execution.executionDay ?? null,
          isTemplate: svc.execution.isTemplate ?? false,
          totalAmount: svc.execution.totalAmount,
          currencyId: svc.execution.currencyId,
          invoiceNumber: svc.execution.invoiceNumber,
          items: svc.execution.items,
          attachments: svc.execution.attachments as TServiceExecutionCreate['attachments'],
          notes: svc.execution.notes,
        })
      }

      // 3. Create assignments
      if (this.assignmentsRepo && assignments.length > 0) {
        const txAssignmentsRepo = this.assignmentsRepo.withTx(tx)
        for (const assignment of assignments) {
          await txAssignmentsRepo.create({
            paymentConceptId: concept.id,
            scopeType: assignment.scopeType,
            condominiumId: assignment.condominiumId,
            buildingId: assignment.buildingId,
            unitId: assignment.unitId,
            distributionMethod: assignment.distributionMethod,
            amount: assignment.amount,
            assignedBy: input.createdBy,
          })
        }
      }

      // 4. Link bank accounts
      if (this.conceptBankAccountsRepo && bankAccountIds.length > 0) {
        const txBankAccountsRepo = this.conceptBankAccountsRepo.withTx(tx)
        for (const bankAccountId of bankAccountIds) {
          await txBankAccountsRepo.linkBankAccount(concept.id, bankAccountId, input.createdBy)
        }
      }

      // 5. Create interest configuration
      if (this.interestConfigsRepo && input.interestConfig) {
        const txInterestRepo = this.interestConfigsRepo.withTx(tx)
        await txInterestRepo.create({
          condominiumId: input.condominiumId!,
          buildingId: null,
          paymentConceptId: concept.id,
          name: input.interestConfig.name,
          description: null,
          interestType: input.interestConfig.interestType,
          interestRate:
            input.interestConfig.interestRate != null
              ? String(input.interestConfig.interestRate)
              : null,
          fixedAmount: null,
          calculationPeriod: (input.interestConfig.calculationPeriod as TCalculationPeriod) ?? null,
          gracePeriodDays: input.interestConfig.gracePeriodDays ?? 0,
          currencyId: input.currencyId,
          isActive: input.interestConfig.isActive ?? true,
          effectiveFrom: input.interestConfig.effectiveFrom,
          effectiveTo: null,
          metadata: null,
          createdBy: input.createdBy,
        })
      }

      return success(concept)
    })

    // ── Post-transaction: trigger quota generation based on strategy ───

    if (result.success) {
      const conceptName = result.data.name ?? input.name
      const condominiumName = condominium.name

      if (input.isRecurring) {
        if (strategy === 'bulk') {
          try {
            await enqueueBulkGeneration({
              paymentConceptId: result.data.id,
              generatedBy: input.createdBy ?? input.managementCompanyId,
            })
            logger.info({ conceptId: result.data.id }, 'Bulk generation job enqueued')
          } catch (error) {
            logger.error(
              { error, conceptId: result.data.id },
              'Failed to enqueue bulk generation job'
            )
          }
        } else if (strategy === 'auto') {
          try {
            await enqueueAutoGeneration()
            logger.info(
              { conceptId: result.data.id },
              'Auto-generation job enqueued after concept creation'
            )
          } catch (error) {
            logger.error(
              { error, conceptId: result.data.id },
              'Failed to enqueue auto-generation job'
            )
          }
        }
      } else {
        // Non-recurring: generate one quota per unit for the current period immediately
        await this.generateNonRecurringQuotas(
          result.data,
          input,
          conceptName,
          condominiumName,
          currency.symbol ?? '$'
        )
      }
    }

    return result
  }

  /**
   * Generates quotas immediately for a non-recurring concept and notifies affected residents.
   */
  private async generateNonRecurringQuotas(
    concept: TPaymentConcept,
    input: ICreatePaymentConceptFullInput,
    conceptName: string,
    condominiumName: string,
    currencySymbol: string
  ): Promise<void> {
    logger.info(
      {
        conceptId: concept.id,
        isRecurring: input.isRecurring,
        hasAssignmentsRepo: !!this.assignmentsRepo,
        hasUnitsRepo: !!this.unitsRepo,
        hasQuotasRepo: !!this.quotasRepo,
      },
      'Non-recurring concept: starting quota generation'
    )

    if (!this.assignmentsRepo || !this.unitsRepo || !this.quotasRepo) {
      logger.warn(
        {
          conceptId: concept.id,
          hasAssignmentsRepo: !!this.assignmentsRepo,
          hasUnitsRepo: !!this.unitsRepo,
          hasQuotasRepo: !!this.quotasRepo,
        },
        'Non-recurring concept created but quota generation skipped (missing repos)'
      )
      return
    }

    try {
      const now = new Date()
      const periodYear = now.getUTCFullYear()
      const periodMonth = now.getUTCMonth() + 1
      const generatedBy = input.createdBy ?? input.managementCompanyId

      const generateService = new GenerateChargesService(
        this.db,
        this.paymentConceptsRepo,
        this.assignmentsRepo,
        this.unitsRepo,
        this.quotasRepo,
        this.executionsRepo as unknown as ConstructorParameters<typeof GenerateChargesService>[5]
      )

      const genResult = await generateService.execute({
        paymentConceptId: concept.id,
        periodYear,
        periodMonth,
        generatedBy,
      })

      if (genResult.success) {
        logger.info(
          {
            conceptId: concept.id,
            quotasCreated: genResult.data.quotasCreated,
            totalAmount: genResult.data.totalAmount,
          },
          'Non-recurring concept: quotas generated successfully'
        )

        // Auto-generate receipts (if enabled) — before notifications so receiptId is available for PDF attachment
        let unitReceiptMap = new Map<string, string>()
        const shouldGenerateReceipts = input.generateReceipts !== false
        if (shouldGenerateReceipts) {
          try {
            const { autoGenerateReceipts } =
              await import('@src/services/receipts/auto-generate-receipts.service')
            const { CondominiumReceiptsRepository, BuildingsRepository } =
              await import('@database/repositories')
            const receiptResult = await autoGenerateReceipts(
              {
                receiptsRepo: new CondominiumReceiptsRepository(this.db),
                quotasRepo: this.quotasRepo as never,
                unitsRepo: this.unitsRepo as never,
                buildingsRepo: new BuildingsRepository(this.db),
              },
              {
                unitIds: genResult.data.unitDetails.map(u => u.unitId),
                conceptType: concept.conceptType ?? 'other',
                condominiumId: concept.condominiumId!,
                periodYear,
                periodMonth,
                currencyId: concept.currencyId,
                generatedBy,
              }
            )

            unitReceiptMap = receiptResult.unitReceiptMap

            // Notify admin if receipts already existed for some units
            if (receiptResult.conflicts.length > 0) {
              await this.notifyAdminReceiptConflicts(
                input.createdBy,
                conceptName,
                condominiumName,
                periodYear,
                periodMonth,
                receiptResult.conflicts.length,
                genResult.data.unitDetails.length,
                input.condominiumId ?? undefined
              )
            }
          } catch (receiptError) {
            logger.error(
              { error: receiptError, conceptId: concept.id },
              'Non-recurring concept: failed to auto-generate receipts'
            )
          }
        } else {
          logger.info(
            { conceptId: concept.id },
            'Non-recurring concept: receipt generation skipped (generateReceipts=false)'
          )
        }

        // Notify affected residents (if enabled)
        if (input.notifyImmediately !== false) {
          await this.notifyResidents(
            genResult.data.unitDetails,
            conceptName,
            condominiumName,
            currencySymbol,
            genResult.data.dueDate,
            input.condominiumId ?? undefined,
            unitReceiptMap
          )
        }
      } else {
        logger.error(
          { conceptId: concept.id, error: genResult.error, code: genResult.code },
          'Non-recurring concept: failed to generate quotas'
        )
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined

      logger.error(
        { error: msg, stack, conceptId: concept.id },
        'Non-recurring concept: error generating quotas'
      )
    }
  }

  /**
   * Sends email + in-app + websocket notifications to residents of affected units.
   * Each resident receives a notification with the amount and quota count for their specific units.
   */
  private async notifyResidents(
    unitDetails: Array<{ unitId: string; amount: number }>,
    conceptName: string,
    condominiumName: string,
    currencySymbol: string,
    dueDate: string,
    condominiumId?: string,
    unitReceiptMap: Map<string, string> = new Map()
  ): Promise<void> {
    if (unitDetails.length === 0 || !this.unitOwnershipsRepo) return

    try {
      const unitIds = unitDetails.map(u => u.unitId)
      const ownerships = await this.unitOwnershipsRepo.getRegisteredByUnitIds(unitIds)

      if (ownerships.length === 0) {
        logger.info('Non-recurring concept: no registered residents to notify')
        return
      }

      // Build per-unit amount lookup
      const unitAmountMap = new Map(unitDetails.map(u => [u.unitId, u.amount]))

      // Group ownerships by userId → unitIds
      const userUnits = new Map<string, string[]>()
      for (const ownership of ownerships) {
        if (!ownership.userId) continue
        if (!userUnits.has(ownership.userId)) {
          userUnits.set(ownership.userId, [])
        }
        userUnits.get(ownership.userId)!.push(ownership.unitId)
      }

      const formattedDueDate = new Date(dueDate + 'T00:00:00').toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      const wsManager = WebSocketManager.getInstance()

      for (const [userId, userUnitIds] of userUnits) {
        // Calculate per-user totals
        const userAmount = userUnitIds.reduce((sum, uid) => sum + (unitAmountMap.get(uid) ?? 0), 0)
        const userQuotaCount = userUnitIds.length
        const formattedAmount = `${currencySymbol} ${userAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`

        const title = `Nueva cuota: ${conceptName}`
        const body = `Se ha generado una nueva cuota en ${condominiumName}.\nConcepto: ${conceptName}\nMonto: ${formattedAmount}\nVencimiento: ${formattedDueDate}`

        // Find receiptId for this user's unit (use first match for PDF attachment)
        const receiptId = userUnitIds.map(uid => unitReceiptMap.get(uid)).find(Boolean)

        // Enqueue email + in-app notification via pg-boss
        try {
          await enqueueNotification({
            userId,
            category: 'quota',
            title,
            body,
            channels: ['in_app', 'email', 'push'],
            data: {
              condominiumId,
              conceptName,
              condominiumName,
              totalAmount: formattedAmount,
              dueDate: formattedDueDate,
              quotasCreated: userQuotaCount,
              ...(receiptId ? { receiptId } : {}),
            },
          })
        } catch (notifyError) {
          logger.error(
            { error: notifyError, userId },
            'Failed to enqueue notification for resident'
          )
        }

        // Send real-time websocket notification
        try {
          wsManager.broadcastToUser(userId, 'notification:new', {
            category: 'quota',
            title,
            body,
            data: {
              conceptName,
              condominiumName,
              totalAmount: formattedAmount,
              dueDate: formattedDueDate,
            },
          })
        } catch {
          // WebSocket is best-effort, ignore errors
        }
      }

      logger.info(
        { usersNotified: userUnits.size },
        'Non-recurring concept: resident notifications sent'
      )
    } catch (error) {
      logger.error({ error }, 'Non-recurring concept: failed to notify residents')
    }
  }

  /**
   * Notifies the admin that receipts could not be generated because they already
   * exist for the given period. Sends via email + in-app notification.
   */
  private async notifyAdminReceiptConflicts(
    adminUserId: string,
    conceptName: string,
    condominiumName: string,
    periodYear: number,
    periodMonth: number,
    conflictCount: number,
    totalUnits: number,
    condominiumId?: string
  ): Promise<void> {
    const MONTH_NAMES = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const periodStr = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`

    const title = 'Recibos no regenerados'
    const body = [
      `Al crear el concepto "${conceptName}" en ${condominiumName}, se generaron las cuotas correctamente, ` +
        `pero no se pudieron generar nuevos recibos para ${conflictCount} de ${totalUnits} unidades ` +
        `porque ya existen recibos para el período ${periodStr}.`,
      '',
      'Los recibos existentes NO incluyen la nueva cuota. Para incluirla:',
      '1. Anule los recibos del período desde la sección de Recibos.',
      '2. Regenere los recibos para que incluyan todas las cuotas del período.',
      '',
      `Concepto creado: ${conceptName}`,
      `Condominio: ${condominiumName}`,
      `Período: ${periodStr}`,
      `Unidades afectadas: ${conflictCount} de ${totalUnits}`,
    ].join('\n')

    try {
      await enqueueNotification({
        userId: adminUserId,
        category: 'alert',
        title,
        body,
        channels: ['in_app', 'email', 'push'],
        data: {
          condominiumId,
          conceptName,
          condominiumName,
          periodYear,
          periodMonth,
          conflictCount,
          totalUnits,
        },
      })

      logger.info(
        { adminUserId, conflictCount, totalUnits, periodStr },
        'Receipt conflict notification sent to admin'
      )
    } catch (error) {
      logger.error({ error, adminUserId }, 'Failed to send receipt conflict notification')
    }
  }
}
