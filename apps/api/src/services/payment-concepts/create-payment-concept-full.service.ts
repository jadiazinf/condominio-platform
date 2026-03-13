import type { TPaymentConcept, TPaymentConceptCreate, TServiceExecutionCreate } from '@packages/domain'
import type {
  PaymentConceptsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
  PaymentConceptServicesRepository,
  ServiceExecutionsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { enqueueBulkGeneration } from '@src/queue/boss-client'
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
    executionDate: string
    totalAmount: string
    currencyId: string
    invoiceNumber?: string
    items: Array<{ id: string; description: string; quantity: number; unitPrice: number; amount: number; notes?: string }>
    attachments: Array<{ name: string; url: string; mimeType: string; size: number; storagePath?: string }>
    notes?: string
  }
}

export interface ICreatePaymentConceptFullInput extends TPaymentConceptCreate {
  managementCompanyId: string
  createdBy: string
  services?: IServiceWithExecution[]
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
    private readonly executionsRepo: ServiceExecutionsRepository
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
      if (!input.recurrencePeriod) return failure('Recurrence period is required for recurring concepts', 'BAD_REQUEST')
      if (input.issueDay == null) return failure('Issue day is required for recurring concepts', 'BAD_REQUEST')
      if (input.dueDay == null) return failure('Due day is required for recurring concepts', 'BAD_REQUEST')
    }

    // Validate bulk generation strategy requirements
    const strategy = input.chargeGenerationStrategy ?? 'auto'
    if (input.isRecurring && strategy === 'bulk') {
      if (!input.effectiveFrom) return failure('Start date is required for bulk generation', 'BAD_REQUEST')
      if (!input.effectiveUntil) return failure('End date is required for bulk generation', 'BAD_REQUEST')
      const from = new Date(input.effectiveFrom)
      const until = new Date(input.effectiveUntil)
      if (until <= from) return failure('End date must be after start date', 'BAD_REQUEST')
      const monthsDiff = (until.getFullYear() - from.getFullYear()) * 12 + (until.getMonth() - from.getMonth())
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
        return failure('Days before due must be greater than 0 for early payment discounts', 'BAD_REQUEST')
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

    // ── Transaction: create concept + link services + create executions ────

    const result = await this.db.transaction(async (tx) => {
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
          executionDate: svc.execution.executionDate,
          totalAmount: svc.execution.totalAmount,
          currencyId: svc.execution.currencyId,
          invoiceNumber: svc.execution.invoiceNumber,
          items: svc.execution.items,
          attachments: svc.execution.attachments as TServiceExecutionCreate['attachments'],
          notes: svc.execution.notes,
        })
      }

      return success(concept)
    })

    // ── Post-transaction: enqueue bulk generation if strategy is 'bulk' ───

    if (result.success && input.isRecurring && strategy === 'bulk') {
      try {
        await enqueueBulkGeneration({
          paymentConceptId: result.data.id,
          generatedBy: input.createdBy ?? input.managementCompanyId,
        })
        logger.info({ conceptId: result.data.id }, 'Bulk generation job enqueued')
      } catch (error) {
        // Don't fail the concept creation if enqueue fails
        // The user can manually trigger bulk generation later
        logger.error({ error, conceptId: result.data.id }, 'Failed to enqueue bulk generation job')
      }
    }

    return result
  }
}
