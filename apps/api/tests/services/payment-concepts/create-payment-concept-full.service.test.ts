/**
 * Tests for CreatePaymentConceptFullService
 *
 * Coverage:
 * - Creates concept + services + executions in transaction
 * - Creates assignments in transaction
 * - Links bank accounts in transaction
 * - Creates interest configuration in transaction
 * - Enqueues bulk generation post-transaction when strategy is 'bulk'
 * - Does NOT enqueue bulk when strategy is 'auto' or 'manual'
 * - Validates required fields (name, condominiumId, services for maintenance)
 * - Validates condominium exists and belongs to MC
 * - Validates currency exists
 * - Backward compat: works without optional repos
 */
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { CreatePaymentConceptFullService } from '@src/services/payment-concepts/create-payment-concept-full.service'

// Mock enqueueBulkGeneration
const mockEnqueue = mock(() => Promise.resolve('job-123'))
mock.module('@src/queue/boss-client', () => ({
  enqueueBulkGeneration: mockEnqueue,
}))

// Mock logger
mock.module('@utils/logger', () => ({
  default: { info: () => {}, error: () => {}, warn: () => {} },
}))

const mockConcept = {
  id: 'concept-1',
  condominiumId: 'condo-1',
  name: 'Test Concept',
  conceptType: 'maintenance',
  isRecurring: true,
  recurrencePeriod: 'monthly',
  currencyId: 'currency-1',
  chargeGenerationStrategy: 'auto',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockDb() {
  return {
    transaction: async <T>(fn: (tx: any) => Promise<T>) => fn({} as any),
  }
}

function createMockConceptsRepo() {
  return {
    create: mock(() => Promise.resolve(mockConcept)),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

function createMockCondominiumsRepo() {
  return {
    getById: mock(() => Promise.resolve({ id: 'condo-1', name: 'Test Condo' })),
  }
}

function createMockCurrenciesRepo() {
  return {
    getById: mock(() => Promise.resolve({ id: 'currency-1', code: 'USD' })),
  }
}

function createMockCondominiumMCRepo() {
  return {
    getByCondominiumAndMC: mock(() => Promise.resolve({ id: 'condo-mc-1' })),
  }
}

function createMockConceptServicesRepo() {
  return {
    linkService: mock(() => Promise.resolve()),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

function createMockCondominiumServicesRepo() {
  return {
    getById: mock(() =>
      Promise.resolve({ id: 'service-1', condominiumId: 'condo-1', name: 'Cleaning' })
    ),
  }
}

function createMockExecutionsRepo() {
  return {
    create: mock(() => Promise.resolve({ id: 'exec-1' })),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

function createMockAssignmentsRepo() {
  return {
    create: mock(() => Promise.resolve({ id: 'assignment-1' })),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

function createMockBankAccountsRepo() {
  return {
    linkBankAccount: mock(() => Promise.resolve({ id: 'link-1' })),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

function createMockInterestConfigsRepo() {
  return {
    create: mock(() => Promise.resolve({ id: 'interest-1' })),
    withTx: mock(function (this: any) {
      return this
    }),
  }
}

const baseInput = {
  condominiumId: 'condo-1',
  name: 'Mantenimiento',
  conceptType: 'maintenance' as const,
  isRecurring: true,
  recurrencePeriod: 'monthly' as const,
  currencyId: 'currency-1',
  chargeGenerationStrategy: 'auto' as const,
  issueDay: 1,
  dueDay: 28,
  allowsPartialPayment: true,
  latePaymentType: 'none' as const,
  latePaymentValue: null,
  latePaymentGraceDays: 0,
  earlyPaymentType: 'none' as const,
  earlyPaymentValue: null,
  earlyPaymentDaysBeforeDue: 0,
  effectiveFrom: '2026-01-01',
  effectiveUntil: null,
  isActive: true,
  metadata: null,
  createdBy: 'user-1',
  managementCompanyId: 'mc-1',
  services: [
    {
      serviceId: 'service-1',
      amount: 100,
      useDefaultAmount: false,
      execution: {
        title: 'Limpieza',
        totalAmount: '100.00',
        currencyId: 'currency-1',
        items: [],
        attachments: [],
      },
    },
  ],
}

describe('CreatePaymentConceptFullService', () => {
  let mockDb: ReturnType<typeof createMockDb>
  let mockConceptsRepo: ReturnType<typeof createMockConceptsRepo>
  let mockCondominiumsRepo: ReturnType<typeof createMockCondominiumsRepo>
  let mockCurrenciesRepo: ReturnType<typeof createMockCurrenciesRepo>
  let mockCondominiumMCRepo: ReturnType<typeof createMockCondominiumMCRepo>
  let mockConceptServicesRepo: ReturnType<typeof createMockConceptServicesRepo>
  let mockCondominiumServicesRepo: ReturnType<typeof createMockCondominiumServicesRepo>
  let mockExecutionsRepo: ReturnType<typeof createMockExecutionsRepo>
  let mockAssignmentsRepo: ReturnType<typeof createMockAssignmentsRepo>
  let mockBankAccountsRepo: ReturnType<typeof createMockBankAccountsRepo>
  let mockInterestConfigsRepo: ReturnType<typeof createMockInterestConfigsRepo>

  beforeEach(() => {
    mockDb = createMockDb()
    mockConceptsRepo = createMockConceptsRepo()
    mockCondominiumsRepo = createMockCondominiumsRepo()
    mockCurrenciesRepo = createMockCurrenciesRepo()
    mockCondominiumMCRepo = createMockCondominiumMCRepo()
    mockConceptServicesRepo = createMockConceptServicesRepo()
    mockCondominiumServicesRepo = createMockCondominiumServicesRepo()
    mockExecutionsRepo = createMockExecutionsRepo()
    mockAssignmentsRepo = createMockAssignmentsRepo()
    mockBankAccountsRepo = createMockBankAccountsRepo()
    mockInterestConfigsRepo = createMockInterestConfigsRepo()
    mockEnqueue.mockClear()
  })

  function createService(opts?: { withOptionalRepos?: boolean }) {
    const withOptional = opts?.withOptionalRepos ?? true
    return new CreatePaymentConceptFullService(
      mockDb as never,
      mockConceptsRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockCondominiumMCRepo as never,
      mockConceptServicesRepo as never,
      mockCondominiumServicesRepo as never,
      mockExecutionsRepo as never,
      withOptional ? (mockAssignmentsRepo as never) : undefined,
      withOptional ? (mockBankAccountsRepo as never) : undefined,
      withOptional ? (mockInterestConfigsRepo as never) : undefined
    )
  }

  describe('Happy path - full creation', () => {
    it('should create concept + services + executions', async () => {
      const service = createService()
      const result = await service.execute(baseInput as any)

      expect(result.success).toBe(true)
      expect(mockConceptsRepo.create).toHaveBeenCalledTimes(1)
      expect(mockConceptServicesRepo.linkService).toHaveBeenCalledTimes(1)
      expect(mockExecutionsRepo.create).toHaveBeenCalledTimes(1)
    })

    it('should create assignments in transaction', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId: 'condo-1',
            distributionMethod: 'fixed_per_unit',
            amount: 100,
          },
          {
            scopeType: 'unit',
            condominiumId: 'condo-1',
            unitId: 'unit-1',
            distributionMethod: 'fixed_per_unit',
            amount: 50,
          },
        ],
      } as any)

      expect(result.success).toBe(true)
      expect(mockAssignmentsRepo.create).toHaveBeenCalledTimes(2)
      expect(mockAssignmentsRepo.withTx).toHaveBeenCalledTimes(1)
    })

    it('should link bank accounts in transaction', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        bankAccountIds: ['bank-1', 'bank-2'],
      } as any)

      expect(result.success).toBe(true)
      expect(mockBankAccountsRepo.linkBankAccount).toHaveBeenCalledTimes(2)
      expect(mockBankAccountsRepo.withTx).toHaveBeenCalledTimes(1)
    })

    it('should create interest configuration in transaction', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        interestConfig: {
          name: 'Test Interest',
          interestType: 'simple',
          interestRate: 5,
          calculationPeriod: 'monthly',
          gracePeriodDays: 3,
          isActive: true,
          effectiveFrom: '2026-01-01',
        },
      } as any)

      expect(result.success).toBe(true)
      expect(mockInterestConfigsRepo.create).toHaveBeenCalledTimes(1)
      expect(mockInterestConfigsRepo.withTx).toHaveBeenCalledTimes(1)

      const createCall = (mockInterestConfigsRepo.create as any).mock.calls[0][0]
      expect(createCall.paymentConceptId).toBe('concept-1')
      expect(createCall.interestType).toBe('simple')
      expect(createCall.interestRate).toBe('5')
      expect(createCall.gracePeriodDays).toBe(3)
    })

    it('should create all resources together', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId: 'condo-1',
            distributionMethod: 'equal_split',
            amount: 200,
          },
        ],
        bankAccountIds: ['bank-1'],
        interestConfig: {
          name: 'Interest',
          interestType: 'simple',
          interestRate: 3,
          effectiveFrom: '2026-01-01',
        },
      } as any)

      expect(result.success).toBe(true)
      expect(mockConceptsRepo.create).toHaveBeenCalledTimes(1)
      expect(mockConceptServicesRepo.linkService).toHaveBeenCalledTimes(1)
      expect(mockExecutionsRepo.create).toHaveBeenCalledTimes(1)
      expect(mockAssignmentsRepo.create).toHaveBeenCalledTimes(1)
      expect(mockBankAccountsRepo.linkBankAccount).toHaveBeenCalledTimes(1)
      expect(mockInterestConfigsRepo.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('Bulk generation enqueue', () => {
    it('should enqueue bulk generation when strategy is bulk', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        chargeGenerationStrategy: 'bulk',
        effectiveUntil: '2026-12-31',
      } as any)

      expect(result.success).toBe(true)
      expect(mockEnqueue).toHaveBeenCalledTimes(1)
      expect(mockEnqueue).toHaveBeenCalledWith({
        paymentConceptId: 'concept-1',
        generatedBy: 'user-1',
      })
    })

    it('should NOT enqueue bulk generation when strategy is auto', async () => {
      const service = createService()
      await service.execute({ ...baseInput, chargeGenerationStrategy: 'auto' } as any)

      expect(mockEnqueue).not.toHaveBeenCalled()
    })

    it('should NOT enqueue bulk generation when strategy is manual', async () => {
      const service = createService()
      await service.execute({ ...baseInput, chargeGenerationStrategy: 'manual' } as any)

      expect(mockEnqueue).not.toHaveBeenCalled()
    })

    it('should still succeed if enqueue fails', async () => {
      mockEnqueue.mockImplementationOnce(() => Promise.reject(new Error('Queue down')))
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        chargeGenerationStrategy: 'bulk',
        effectiveUntil: '2026-12-31',
      } as any)

      expect(result.success).toBe(true)
    })
  })

  describe('Backward compatibility', () => {
    it('should work without optional repos (assignments, bankAccounts, interestConfig)', async () => {
      const service = createService({ withOptionalRepos: false })
      const result = await service.execute({
        ...baseInput,
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId: 'condo-1',
            distributionMethod: 'equal_split',
            amount: 100,
          },
        ],
        bankAccountIds: ['bank-1'],
        interestConfig: {
          name: 'Test',
          interestType: 'simple',
          interestRate: 5,
          effectiveFrom: '2026-01-01',
        },
      } as any)

      expect(result.success).toBe(true)
      // These should not have been called since repos weren't provided
      expect(mockAssignmentsRepo.create).not.toHaveBeenCalled()
      expect(mockBankAccountsRepo.linkBankAccount).not.toHaveBeenCalled()
      expect(mockInterestConfigsRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('Validation errors', () => {
    it('should fail when name is empty', async () => {
      const service = createService()
      const result = await service.execute({ ...baseInput, name: '' } as any)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.code).toBe('BAD_REQUEST')
    })

    it('should fail when condominiumId is missing', async () => {
      const service = createService()
      const result = await service.execute({ ...baseInput, condominiumId: null } as any)
      expect(result.success).toBe(false)
    })

    it('should fail when condominium not found', async () => {
      mockCondominiumsRepo.getById = mock(() => Promise.resolve(null)) as never
      const service = createService()
      const result = await service.execute(baseInput as any)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBe('CONDOMINIUM_NOT_FOUND')
    })

    it('should fail when condominium does not belong to MC', async () => {
      mockCondominiumMCRepo.getByCondominiumAndMC = mock(() => Promise.resolve(null)) as never
      const service = createService()
      const result = await service.execute(baseInput as any)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBe('CONDOMINIUM_NOT_IN_COMPANY')
    })

    it('should fail when currency not found', async () => {
      mockCurrenciesRepo.getById = mock(() => Promise.resolve(null)) as never
      const service = createService()
      const result = await service.execute(baseInput as any)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBe('CURRENCY_NOT_FOUND')
    })

    it('should fail when maintenance concept has no services', async () => {
      const service = createService()
      const result = await service.execute({ ...baseInput, services: [] } as any)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBe('SERVICES_REQUIRED')
    })

    it('should fail when bulk strategy has no effectiveUntil', async () => {
      const service = createService()
      const result = await service.execute({
        ...baseInput,
        chargeGenerationStrategy: 'bulk',
        effectiveUntil: null,
      } as any)
      expect(result.success).toBe(false)
    })
  })

  describe('Execution fields (executionDay, isTemplate)', () => {
    it('should pass executionDay and isTemplate to execution create', async () => {
      const service = createService()
      await service.execute({
        ...baseInput,
        services: [
          {
            serviceId: 'service-1',
            amount: 100,
            useDefaultAmount: false,
            execution: {
              title: 'Monthly Cleaning',
              executionDate: null,
              executionDay: 15,
              isTemplate: true,
              totalAmount: '100.00',
              currencyId: 'currency-1',
              items: [],
              attachments: [],
            },
          },
        ],
      } as any)

      const createCall = (mockExecutionsRepo.create as any).mock.calls[0][0]
      expect(createCall.executionDay).toBe(15)
      expect(createCall.isTemplate).toBe(true)
      expect(createCall.executionDate).toBeNull()
    })

    it('should default isTemplate to false when not provided', async () => {
      const service = createService()
      await service.execute(baseInput as any)

      const createCall = (mockExecutionsRepo.create as any).mock.calls[0][0]
      expect(createCall.isTemplate).toBe(false)
    })
  })
})
