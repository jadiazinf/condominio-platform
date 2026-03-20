import type {
  TPaymentConcept,
  TPaymentConceptChange,
  TPaymentConceptAssignment,
  TPaymentConceptBankAccount,
} from '@packages/domain'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

type TConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
  update: (id: string, data: Record<string, unknown>) => Promise<TPaymentConcept | null>
  withTx: (tx: TDrizzleClient) => TConceptsRepo
}

type TAssignmentCreateData = {
  paymentConceptId: string
  scopeType: 'condominium' | 'building' | 'unit'
  condominiumId: string
  buildingId?: string
  unitId?: string
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
  assignedBy: string
}

type TAssignmentsRepo = {
  listByConceptId: (conceptId: string, activeOnly?: boolean) => Promise<TPaymentConceptAssignment[]>
  deactivateAllByConceptId: (conceptId: string) => Promise<number>
  create: (data: TAssignmentCreateData) => Promise<TPaymentConceptAssignment>
  withTx: (tx: TDrizzleClient) => TAssignmentsRepo
}

type TBankAccountsRepo = {
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptBankAccount[]>
  linkBankAccount: (
    conceptId: string,
    bankAccountId: string,
    assignedBy: string | null
  ) => Promise<TPaymentConceptBankAccount>
  unlinkBankAccount: (conceptId: string, bankAccountId: string) => Promise<boolean>
  withTx: (tx: TDrizzleClient) => TBankAccountsRepo
}

type TConceptServicesRepo = {
  listByConceptId: (
    conceptId: string
  ) => Promise<Array<{ id: string; serviceId: string; amount: number; useDefaultAmount: boolean }>>
  linkService: (
    conceptId: string,
    serviceId: string,
    amount: number,
    useDefault: boolean
  ) => Promise<unknown>
  unlinkService: (conceptId: string, serviceId: string) => Promise<boolean>
  withTx: (tx: TDrizzleClient) => TConceptServicesRepo
}

type TChangesRepo = {
  create: (data: {
    paymentConceptId: string
    condominiumId: string
    changedBy: string
    previousValues: Record<string, unknown>
    newValues: Record<string, unknown>
    notes?: string | null
  }) => Promise<TPaymentConceptChange>
  withTx: (tx: TDrizzleClient) => TChangesRepo
}

type TCondominiumsRepo = {
  getById: (id: string) => Promise<{ id: string; name: string } | null>
}

type TCurrenciesRepo = {
  getById: (id: string) => Promise<{ id: string; code: string } | null>
}

type TCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

type TCondominiumServicesRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; name: string } | null>
}

type TInterestConfigRecord = {
  id: string
  interestType: string
  interestRate: string | null
  fixedAmount: string | null
  calculationPeriod: string | null
  gracePeriodDays: number
  effectiveFrom: string | Date
  effectiveTo: string | Date | null
  isActive: boolean
  [key: string]: unknown
}

type TInterestConfigsRepo = {
  getByPaymentConceptId: (id: string, includeInactive?: boolean) => Promise<TInterestConfigRecord[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => Promise<any>
  withTx: (tx: TDrizzleClient) => TInterestConfigsRepo
}

interface IAssignmentInput {
  scopeType: 'condominium' | 'building' | 'unit'
  condominiumId: string
  buildingId?: string
  unitId?: string
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount: number
}

interface IServiceInput {
  serviceId: string
  amount: number
  useDefaultAmount: boolean
}

export interface IUpdatePaymentConceptFullInput {
  conceptId: string
  managementCompanyId: string
  changedBy: string
  notes: string | null
  // Base concept fields
  name: string
  description: string | null
  conceptType: TPaymentConcept['conceptType']
  isRecurring: boolean
  recurrencePeriod: TPaymentConcept['recurrencePeriod']
  currencyId: string
  allowsPartialPayment: boolean
  latePaymentType: TPaymentConcept['latePaymentType']
  latePaymentValue: number | null
  latePaymentGraceDays: number
  earlyPaymentType: TPaymentConcept['earlyPaymentType']
  earlyPaymentValue: number | null
  earlyPaymentDaysBeforeDue: number
  issueDay: number | null
  dueDay: number | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  chargeGenerationStrategy: TPaymentConcept['chargeGenerationStrategy']
  isActive: boolean
  metadata: Record<string, unknown> | null
  // Related entities — undefined = no changes, array = replace
  assignments?: IAssignmentInput[]
  bankAccountIds?: string[]
  services?: IServiceInput[]
  interestConfiguration?: {
    interestType: 'simple' | 'compound' | 'fixed_amount'
    interestRate: string | null
    fixedAmount: string | null
    calculationPeriod: string | null
    gracePeriodDays: number
    effectiveFrom: string
    effectiveTo: string | null
  } | null // null means explicitly remove
}

// Fields to compare for diff detection
const DIFF_FIELDS = [
  'name',
  'description',
  'conceptType',
  'isRecurring',
  'recurrencePeriod',
  'currencyId',
  'allowsPartialPayment',
  'latePaymentType',
  'latePaymentValue',
  'latePaymentGraceDays',
  'earlyPaymentType',
  'earlyPaymentValue',
  'earlyPaymentDaysBeforeDue',
  'issueDay',
  'dueDay',
  'effectiveFrom',
  'effectiveUntil',
  'chargeGenerationStrategy',
  'isActive',
  'metadata',
] as const

export class UpdatePaymentConceptFullService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly paymentConceptsRepo: TConceptsRepo,
    private readonly assignmentsRepo: TAssignmentsRepo,
    private readonly bankAccountsRepo: TBankAccountsRepo,
    private readonly conceptServicesRepo: TConceptServicesRepo,
    private readonly changesRepo: TChangesRepo,
    private readonly condominiumsRepo: TCondominiumsRepo,
    private readonly currenciesRepo: TCurrenciesRepo,
    private readonly condominiumMCRepo: TCondominiumMCRepo,
    private readonly condominiumServicesRepo?: TCondominiumServicesRepo,
    private readonly interestConfigsRepo?: TInterestConfigsRepo
  ) {}

  async execute(input: IUpdatePaymentConceptFullInput): Promise<TServiceResult<TPaymentConcept>> {
    // ── Load existing concept ─────────────────────────────────────────────

    const existing = await this.paymentConceptsRepo.getById(input.conceptId)
    if (!existing) {
      return failure('CONCEPT_NOT_FOUND', 'NOT_FOUND')
    }

    // ── Pre-transaction validations ───────────────────────────────────────

    if (!input.name || input.name.trim().length === 0) {
      return failure('Name is required', 'BAD_REQUEST')
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
    const condominium = await this.condominiumsRepo.getById(existing.condominiumId!)
    if (!condominium) {
      return failure('CONDOMINIUM_NOT_FOUND', 'NOT_FOUND')
    }

    // Validate condominium belongs to MC
    const condominiumMC = await this.condominiumMCRepo.getByCondominiumAndMC(
      existing.condominiumId!,
      input.managementCompanyId
    )
    if (!condominiumMC) {
      return failure('CONDOMINIUM_NOT_IN_COMPANY', 'NOT_FOUND')
    }

    // Validate currency exists
    const currency = await this.currenciesRepo.getById(input.currencyId)
    if (!currency) {
      return failure('CURRENCY_NOT_FOUND', 'NOT_FOUND')
    }

    // Validate services exist (if being updated)
    if (input.services && this.condominiumServicesRepo) {
      for (const svc of input.services) {
        const service = await this.condominiumServicesRepo.getById(svc.serviceId)
        if (!service) {
          return failure('SERVICE_NOT_FOUND', 'NOT_FOUND')
        }
      }
    }

    // Validate bulk generation strategy requirements
    if (input.isRecurring && input.chargeGenerationStrategy === 'bulk') {
      if (!input.effectiveFrom)
        return failure('Start date is required for bulk generation', 'BAD_REQUEST')
      if (!input.effectiveUntil)
        return failure('End date is required for bulk generation', 'BAD_REQUEST')
      if (input.effectiveUntil <= input.effectiveFrom)
        return failure('End date must be after start date', 'BAD_REQUEST')
    }

    // ── Compute diff ──────────────────────────────────────────────────────

    const previousValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}

    for (const field of DIFF_FIELDS) {
      const oldVal = existing[field]
      const newVal = input[field]

      if (!this.isEqual(oldVal, newVal)) {
        previousValues[field] = oldVal
        newValues[field] = newVal
      }
    }

    // Check related entities diff
    const hasAssignmentChanges = input.assignments !== undefined
    const hasBankAccountChanges = input.bankAccountIds !== undefined
    const hasServiceChanges = input.services !== undefined

    // Load current related data for diff tracking
    let assignmentsDiff = false
    if (hasAssignmentChanges) {
      const currentAssignments = await this.assignmentsRepo.listByConceptId(input.conceptId)
      assignmentsDiff = this.assignmentsChanged(currentAssignments, input.assignments!)
      if (assignmentsDiff) {
        previousValues.assignments = currentAssignments.map(a => ({
          scopeType: a.scopeType,
          condominiumId: a.condominiumId,
          buildingId: a.buildingId,
          unitId: a.unitId,
          distributionMethod: a.distributionMethod,
          amount: a.amount,
        }))
        newValues.assignments = input.assignments
      }
    }

    let bankAccountsDiff = false
    if (hasBankAccountChanges) {
      const currentBankAccounts = await this.bankAccountsRepo.listByConceptId(input.conceptId)
      const currentIds = currentBankAccounts.map(ba => ba.bankAccountId).sort()
      const newIds = [...input.bankAccountIds!].sort()
      bankAccountsDiff = JSON.stringify(currentIds) !== JSON.stringify(newIds)
      if (bankAccountsDiff) {
        previousValues.bankAccountIds = currentIds
        newValues.bankAccountIds = newIds
      }
    }

    let servicesDiff = false
    if (hasServiceChanges) {
      const currentServices = await this.conceptServicesRepo.listByConceptId(input.conceptId)
      servicesDiff = this.servicesChanged(currentServices, input.services!)
      if (servicesDiff) {
        previousValues.services = currentServices.map(s => ({
          serviceId: s.serviceId,
          amount: s.amount,
          useDefaultAmount: s.useDefaultAmount,
        }))
        newValues.services = input.services
      }
    }

    // Interest configuration diff
    let interestConfigDiff = false
    if (input.interestConfiguration !== undefined && this.interestConfigsRepo) {
      const currentConfigs = await this.interestConfigsRepo.getByPaymentConceptId(input.conceptId)
      const currentActive = currentConfigs.find(c => c.isActive)

      if (input.interestConfiguration === null) {
        // Removing: diff if there's an active config
        interestConfigDiff = !!currentActive
        if (interestConfigDiff) {
          previousValues.interestConfiguration = {
            interestType: currentActive!.interestType,
            interestRate: currentActive!.interestRate,
            calculationPeriod: currentActive!.calculationPeriod,
            gracePeriodDays: currentActive!.gracePeriodDays,
          }
          newValues.interestConfiguration = null
        }
      } else {
        // Creating or updating
        const ic = input.interestConfiguration
        if (!currentActive) {
          interestConfigDiff = true
          previousValues.interestConfiguration = null
          newValues.interestConfiguration = ic
        } else {
          // Compare fields
          const changed =
            currentActive.interestType !== ic.interestType ||
            currentActive.interestRate !== ic.interestRate ||
            currentActive.fixedAmount !== ic.fixedAmount ||
            currentActive.calculationPeriod !== ic.calculationPeriod ||
            currentActive.gracePeriodDays !== ic.gracePeriodDays ||
            String(currentActive.effectiveFrom) !== ic.effectiveFrom ||
            String(currentActive.effectiveTo) !== ic.effectiveTo
          if (changed) {
            interestConfigDiff = true
            previousValues.interestConfiguration = {
              interestType: currentActive.interestType,
              interestRate: currentActive.interestRate,
              calculationPeriod: currentActive.calculationPeriod,
              gracePeriodDays: currentActive.gracePeriodDays,
            }
            newValues.interestConfiguration = ic
          }
        }
      }
    }

    // No changes at all
    const hasBaseChanges = Object.keys(newValues).length > 0
    if (
      !hasBaseChanges &&
      !assignmentsDiff &&
      !bankAccountsDiff &&
      !servicesDiff &&
      !interestConfigDiff
    ) {
      return failure('NO_CHANGES_DETECTED', 'BAD_REQUEST')
    }

    // ── Transaction ───────────────────────────────────────────────────────

    const result = await this.db.transaction(async tx => {
      const txConceptsRepo = this.paymentConceptsRepo.withTx(tx)
      const txAssignmentsRepo = this.assignmentsRepo.withTx(tx)
      const txChangesRepo = this.changesRepo.withTx(tx)
      const txBankAccountsRepo = this.bankAccountsRepo.withTx(tx)
      const txConceptServicesRepo = this.conceptServicesRepo.withTx(tx)

      // 1. Update concept base fields (only if there are base changes)
      let updatedConcept = existing
      if (hasBaseChanges) {
        const updateData: Record<string, unknown> = {}
        for (const field of DIFF_FIELDS) {
          if (field in newValues) {
            updateData[field] = newValues[field]
          }
        }
        const updated = await txConceptsRepo.update(input.conceptId, updateData)
        if (updated) updatedConcept = updated
      }

      // 2. Sync assignments (deactivate all + recreate)
      if (hasAssignmentChanges && assignmentsDiff) {
        await txAssignmentsRepo.deactivateAllByConceptId(input.conceptId)
        for (const assignment of input.assignments!) {
          await txAssignmentsRepo.create({
            paymentConceptId: input.conceptId,
            scopeType: assignment.scopeType,
            condominiumId: assignment.condominiumId,
            buildingId: assignment.buildingId,
            unitId: assignment.unitId,
            distributionMethod: assignment.distributionMethod,
            amount: assignment.amount,
            assignedBy: input.changedBy,
          })
        }
      }

      // 3. Sync bank accounts (diff-based: add new, remove old)
      if (hasBankAccountChanges && bankAccountsDiff) {
        const currentBankAccounts = await txBankAccountsRepo.listByConceptId(input.conceptId)
        const currentIds = new Set(currentBankAccounts.map(ba => ba.bankAccountId))
        const newIds = new Set(input.bankAccountIds!)

        // Remove accounts no longer in the list
        for (const currentId of currentIds) {
          if (!newIds.has(currentId)) {
            await txBankAccountsRepo.unlinkBankAccount(input.conceptId, currentId)
          }
        }

        // Add new accounts
        for (const newId of newIds) {
          if (!currentIds.has(newId)) {
            await txBankAccountsRepo.linkBankAccount(input.conceptId, newId, input.changedBy)
          }
        }
      }

      // 4. Sync services (diff-based: add new, remove old)
      if (hasServiceChanges && servicesDiff) {
        const currentServices = await txConceptServicesRepo.listByConceptId(input.conceptId)
        const currentServiceIds = new Set(currentServices.map(s => s.serviceId))
        const newServiceIds = new Set(input.services!.map(s => s.serviceId))

        // Remove services no longer in the list
        for (const currentSvc of currentServices) {
          if (!newServiceIds.has(currentSvc.serviceId)) {
            await txConceptServicesRepo.unlinkService(input.conceptId, currentSvc.serviceId)
          }
        }

        // Add new services
        for (const newSvc of input.services!) {
          if (!currentServiceIds.has(newSvc.serviceId)) {
            await txConceptServicesRepo.linkService(
              input.conceptId,
              newSvc.serviceId,
              newSvc.amount,
              newSvc.useDefaultAmount
            )
          }
        }

        // Update existing services with changed amounts
        for (const newSvc of input.services!) {
          if (currentServiceIds.has(newSvc.serviceId)) {
            const current = currentServices.find(s => s.serviceId === newSvc.serviceId)
            if (
              current &&
              (current.amount !== newSvc.amount ||
                current.useDefaultAmount !== newSvc.useDefaultAmount)
            ) {
              await txConceptServicesRepo.unlinkService(input.conceptId, newSvc.serviceId)
              await txConceptServicesRepo.linkService(
                input.conceptId,
                newSvc.serviceId,
                newSvc.amount,
                newSvc.useDefaultAmount
              )
            }
          }
        }
      }

      // 4.5. Sync interest configuration
      if (
        input.interestConfiguration !== undefined &&
        this.interestConfigsRepo &&
        interestConfigDiff
      ) {
        const txInterestRepo = this.interestConfigsRepo.withTx(tx)
        const existingConfigs = await txInterestRepo.getByPaymentConceptId(input.conceptId)
        const activeConfig = existingConfigs.find(c => c.isActive)

        if (input.interestConfiguration === null && activeConfig) {
          await txInterestRepo.update(activeConfig.id, { isActive: false })
        } else if (input.interestConfiguration !== null) {
          if (activeConfig) {
            await txInterestRepo.update(activeConfig.id, {
              interestType: input.interestConfiguration.interestType,
              interestRate: input.interestConfiguration.interestRate,
              fixedAmount: input.interestConfiguration.fixedAmount,
              calculationPeriod: input.interestConfiguration.calculationPeriod,
              gracePeriodDays: input.interestConfiguration.gracePeriodDays,
              effectiveFrom: input.interestConfiguration.effectiveFrom,
              effectiveTo: input.interestConfiguration.effectiveTo,
            })
          } else {
            await txInterestRepo.create({
              condominiumId: existing.condominiumId,
              paymentConceptId: input.conceptId,
              name: `Interest for ${existing.name}`,
              interestType: input.interestConfiguration.interestType,
              interestRate: input.interestConfiguration.interestRate,
              fixedAmount: input.interestConfiguration.fixedAmount,
              calculationPeriod: input.interestConfiguration.calculationPeriod,
              gracePeriodDays: input.interestConfiguration.gracePeriodDays,
              effectiveFrom: input.interestConfiguration.effectiveFrom,
              effectiveTo: input.interestConfiguration.effectiveTo,
              isActive: true,
              createdBy: input.changedBy,
            })
          }
        }
      }

      // 5. Record change log
      await txChangesRepo.create({
        paymentConceptId: input.conceptId,
        condominiumId: existing.condominiumId!,
        changedBy: input.changedBy,
        previousValues,
        newValues,
        notes: input.notes,
      })

      return success(updatedConcept)
    })

    return result
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null && b == null) return true
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
    if (a instanceof Date || b instanceof Date) {
      const aTime =
        a instanceof Date ? a.getTime() : a == null ? null : new Date(a as string).getTime()
      const bTime =
        b instanceof Date ? b.getTime() : b == null ? null : new Date(b as string).getTime()
      return aTime === bTime
    }
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b)
    }
    return false
  }

  private assignmentsChanged(
    current: Array<{
      scopeType: string
      condominiumId: string
      buildingId: string | null
      unitId: string | null
      distributionMethod: string
      amount: number
    }>,
    incoming: IAssignmentInput[]
  ): boolean {
    if (current.length !== incoming.length) return true
    const serialize = (a: {
      scopeType: string
      condominiumId: string
      buildingId?: string | null
      unitId?: string | null
      distributionMethod: string
      amount: number
    }) =>
      `${a.scopeType}|${a.condominiumId}|${a.buildingId ?? ''}|${a.unitId ?? ''}|${a.distributionMethod}|${a.amount}`
    const currentSet = new Set(current.map(serialize))
    return incoming.some(a => !currentSet.has(serialize(a)))
  }

  private servicesChanged(
    current: Array<{ serviceId: string; amount: number; useDefaultAmount: boolean }>,
    incoming: IServiceInput[]
  ): boolean {
    if (current.length !== incoming.length) return true
    const serialize = (s: { serviceId: string; amount: number; useDefaultAmount: boolean }) =>
      `${s.serviceId}|${s.amount}|${s.useDefaultAmount}`
    const currentSet = new Set(current.map(serialize))
    return incoming.some(s => !currentSet.has(serialize(s)))
  }
}
