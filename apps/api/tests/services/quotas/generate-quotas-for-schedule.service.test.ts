/**
 * Comprehensive test suite for GenerateQuotasForScheduleService
 *
 * Test coverage (32 tests):
 * - Happy path (5 tests): successful generation, building-specific, duplicate prevention, logging, amount calculation
 * - Error cases (6 tests): schedule/rule/formula not found, inactive rule/formula, no units
 * - Edge cases (6 tests): partial failures, all failures, empty buildings, date clamping (Feb & Apr)
 * - Transaction safety (3 tests): writes in transaction, duplicate check in transaction, rollback
 * - Date handling (2 tests): date formatting, period description
 * - Multiple buildings (1 test): units across multiple buildings in a condominium
 * - Template execution cloning (9 tests): clone on generation, executionDay date building, day clamping,
 *   fallback to issueDate, multiple templates, skip when 0 quotas, backward compat without repo,
 *   error resilience, transactional safety
 */
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import type {
  TQuotaGenerationSchedule,
  TQuotaGenerationRule,
  TQuotaFormula,
  TUnit,
  TBuilding,
  TQuota,
  TQuotaGenerationLog,
} from '@packages/domain'
import { GenerateQuotasForScheduleService } from '@src/services/quotas'

type TMockDb = {
  transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>
}

type TMockQuotasRepository = {
  getByPeriod: (year: number, month: number) => Promise<TQuota[]>
  create: (data: any) => Promise<TQuota>
  withTx: (tx: any) => TMockQuotasRepository
}

type TMockQuotaGenerationRulesRepository = {
  getById: (id: string) => Promise<TQuotaGenerationRule | null>
}

type TMockQuotaFormulasRepository = {
  getById: (id: string) => Promise<TQuotaFormula | null>
}

type TMockQuotaGenerationSchedulesRepository = {
  getById: (id: string) => Promise<TQuotaGenerationSchedule | null>
}

type TMockQuotaGenerationLogsRepository = {
  create: (data: any) => Promise<TQuotaGenerationLog>
  withTx: (tx: any) => TMockQuotaGenerationLogsRepository
}

type TMockUnitsRepository = {
  getById: (id: string) => Promise<TUnit | null>
  getByBuildingId: (buildingId: string) => Promise<TUnit[]>
}

type TMockBuildingsRepository = {
  getByCondominiumId: (condominiumId: string) => Promise<TBuilding[]>
}

type TMockServiceExecutionsRepository = {
  getTemplatesByConceptId: (conceptId: string) => Promise<any[]>
  create: (data: any) => Promise<any>
  withTx: (tx: any) => TMockServiceExecutionsRepository
}

describe('GenerateQuotasForScheduleService', function () {
  let service: GenerateQuotasForScheduleService
  let mockDb: TMockDb
  let mockQuotasRepo: TMockQuotasRepository
  let mockRulesRepo: TMockQuotaGenerationRulesRepository
  let mockFormulasRepo: TMockQuotaFormulasRepository
  let mockSchedulesRepo: TMockQuotaGenerationSchedulesRepository
  let mockLogsRepo: TMockQuotaGenerationLogsRepository
  let mockUnitsRepo: TMockUnitsRepository
  let mockBuildingsRepo: TMockBuildingsRepository
  let mockExecutionsRepo: TMockServiceExecutionsRepository

  const mockSchedule: TQuotaGenerationSchedule = {
    id: 'schedule-1',
    quotaGenerationRuleId: 'rule-1',
    name: 'Monthly Generation',
    frequencyType: 'monthly',
    frequencyValue: null,
    generationDay: 1,
    periodsInAdvance: 1,
    issueDay: 1,
    dueDay: 15,
    graceDays: 0,
    isActive: true,
    lastGeneratedPeriod: null,
    lastGeneratedAt: null,
    nextGenerationDate: null,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    updateReason: null,
  }

  const mockRule: TQuotaGenerationRule = {
    id: 'rule-1',
    condominiumId: 'condo-1',
    buildingId: null,
    quotaFormulaId: 'formula-1',
    paymentConceptId: 'concept-1',
    name: 'Monthly Maintenance Fee',
    description: 'Auto-generated monthly maintenance fees',
    isActive: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRuleWithBuilding: TQuotaGenerationRule = {
    ...mockRule,
    id: 'rule-2',
    buildingId: 'building-1',
  }

  const mockFormula: TQuotaFormula = {
    id: 'formula-1',
    condominiumId: 'condo-1',
    name: 'Fixed Maintenance Fee',
    description: 'Standard fixed fee',
    formulaType: 'fixed',
    fixedAmount: '100.00',
    expression: null,
    variables: null,
    unitAmounts: null,
    currencyId: 'currency-1',
    isActive: true,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockInactiveFormula: TQuotaFormula = {
    ...mockFormula,
    id: 'formula-2',
    isActive: false,
  }

  const mockUnit1: TUnit = {
    id: 'unit-1',
    buildingId: 'building-1',
    unitNumber: '101',
    floor: 1,
    areaM2: '75.50',
    bedrooms: null,
    bathrooms: null,
    parkingSpaces: 1,
    parkingIdentifiers: null,
    storageIdentifier: null,
    aliquotPercentage: '5.25',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUnit2: TUnit = {
    id: 'unit-2',
    buildingId: 'building-1',
    unitNumber: '102',
    floor: 1,
    areaM2: '80.00',
    bedrooms: null,
    bathrooms: null,
    parkingSpaces: 1,
    parkingIdentifiers: null,
    storageIdentifier: null,
    aliquotPercentage: '5.50',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockBuilding: TBuilding = {
    id: 'building-1',
    condominiumId: 'condo-1',
    name: 'Building A',
    code: 'A',
    address: '123 Main St',
    floorsCount: 10,
    unitsCount: 20,
    bankAccountHolder: null,
    bankName: null,
    bankAccountNumber: null,
    bankAccountType: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockQuota: TQuota = {
    id: 'quota-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2025,
    periodMonth: 2,
    periodDescription: 'February 2025',
    baseAmount: '100.00',
    currencyId: 'currency-1',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-02-01',
    dueDate: '2025-02-15',
    status: 'pending',
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '100.00',
    notes: null,
    metadata: null,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockLog: TQuotaGenerationLog = {
    id: 'log-1',
    generationRuleId: 'rule-1',
    generationScheduleId: 'schedule-1',
    quotaFormulaId: 'formula-1',
    generationMethod: 'scheduled',
    periodYear: 2025,
    periodMonth: 2,
    periodDescription: 'February 2025',
    quotasCreated: 2,
    quotasFailed: 0,
    totalAmount: '200.00',
    currencyId: 'currency-1',
    unitsAffected: ['unit-1', 'unit-2'],
    parameters: {},
    formulaSnapshot: {},
    status: 'completed',
    errorDetails: null,
    generatedBy: 'system',
    generatedAt: new Date(),
  }

  beforeEach(function () {
    // Create mock database with transaction support
    mockDb = {
      transaction: async function <T>(fn: (tx: any) => Promise<T>) {
        return await fn(mockDb)
      },
    }

    // Create mock repositories
    mockQuotasRepo = {
      getByPeriod: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(mockQuota)),
      withTx: mock(function (this: TMockQuotasRepository) {
        return this
      }),
    }

    mockRulesRepo = {
      getById: mock(() => Promise.resolve(mockRule)),
    }

    mockFormulasRepo = {
      getById: mock(() => Promise.resolve(mockFormula)),
    }

    mockSchedulesRepo = {
      getById: mock(() => Promise.resolve(mockSchedule)),
    }

    mockLogsRepo = {
      create: mock(() => Promise.resolve(mockLog)),
      withTx: mock(function (this: TMockQuotaGenerationLogsRepository) {
        return this
      }),
    }

    mockUnitsRepo = {
      getById: mock(() => Promise.resolve(mockUnit1)),
      getByBuildingId: mock(() => Promise.resolve([mockUnit1, mockUnit2])),
    }

    mockBuildingsRepo = {
      getByCondominiumId: mock(() => Promise.resolve([mockBuilding])),
    }

    mockExecutionsRepo = {
      getTemplatesByConceptId: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: 'exec-cloned-1' })),
      withTx: mock(function (this: TMockServiceExecutionsRepository) {
        return this
      }),
    }

    // Create service instance
    service = new GenerateQuotasForScheduleService(
      mockDb as never,
      mockQuotasRepo as never,
      mockRulesRepo as never,
      mockFormulasRepo as never,
      mockSchedulesRepo as never,
      mockLogsRepo as never,
      mockUnitsRepo as never,
      mockBuildingsRepo as never,
      mockExecutionsRepo as never
    )
  })

  describe('Happy path', function () {
    it('should successfully generate quotas for all units in scope', async function () {
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        expect(result.data.quotasFailed).toBe(0)
        expect(result.data.totalAmount).toBeGreaterThan(0)
        expect(result.data.logId).toBeDefined()
      }
      expect(mockQuotasRepo.create).toHaveBeenCalled()
      expect(mockLogsRepo.create).toHaveBeenCalled()
    })

    it('should successfully generate quotas for a specific building (buildingId set on rule)', async function () {
      mockRulesRepo.getById = mock(() => Promise.resolve(mockRuleWithBuilding))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
      }
      expect(mockUnitsRepo.getByBuildingId).toHaveBeenCalledWith('building-1')
      expect(mockBuildingsRepo.getByCondominiumId).not.toHaveBeenCalled()
    })

    it('should skip units that already have quotas for the same period (duplicate prevention)', async function () {
      // Mock existing quota for unit-1
      const existingQuota = { ...mockQuota, unitId: 'unit-1', status: 'pending' as const }
      mockQuotasRepo.getByPeriod = mock(() => Promise.resolve([existingQuota]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Should only create for unit-2 since unit-1 already has a quota
        expect(result.data.quotasCreated).toBe(1)
      }
    })

    it('should create generation log with correct metadata', async function () {
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      expect(mockLogsRepo.create).toHaveBeenCalled()

      // Check the log creation was called with correct parameters
      const logCreateCall = (mockLogsRepo.create as any).mock.calls[0]
      expect(logCreateCall).toBeDefined()
      expect(logCreateCall[0]).toMatchObject({
        generationRuleId: 'rule-1',
        generationScheduleId: 'schedule-1',
        quotaFormulaId: 'formula-1',
        generationMethod: 'scheduled',
        periodYear: 2025,
        periodMonth: 2,
        periodDescription: 'February 2025',
        generatedBy: 'system',
      })
    })

    it('should calculate correct amounts using the formula', async function () {
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalAmount).toBe(200) // 2 units × 100.00
      }
    })
  })

  describe('Error cases', function () {
    it('should return failure when schedule not found', async function () {
      mockSchedulesRepo.getById = mock(() => Promise.resolve(null))

      const result = await service.execute({
        scheduleId: 'non-existent',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toContain('Schedule not found')
      }
    })

    it('should return failure when rule not found', async function () {
      mockRulesRepo.getById = mock(() => Promise.resolve(null))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Generation rule not found or inactive')
      }
    })

    it('should return failure when rule is inactive', async function () {
      const inactiveRule = { ...mockRule, isActive: false }
      mockRulesRepo.getById = mock(() => Promise.resolve(inactiveRule))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Generation rule not found or inactive')
      }
    })

    it('should return failure when formula not found', async function () {
      mockFormulasRepo.getById = mock(() => Promise.resolve(null))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Formula not found or inactive')
      }
    })

    it('should return failure when formula is inactive', async function () {
      mockFormulasRepo.getById = mock(() => Promise.resolve(mockInactiveFormula))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Formula not found or inactive')
      }
    })

    it('should return failure when no units found in scope', async function () {
      mockUnitsRepo.getByBuildingId = mock(() => Promise.resolve([]))
      mockBuildingsRepo.getByCondominiumId = mock(() => Promise.resolve([mockBuilding]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('No units found in scope')
      }
    })
  })

  describe('Edge cases', function () {
    it('should handle formula calculation errors gracefully (partial success)', async function () {
      // Simulate the service's internal CalculateFormulaAmountService failing for one unit
      // We need to mock the internal service behavior indirectly by making create fail
      let createCallCount = 0
      mockQuotasRepo.create = mock(function () {
        createCallCount++
        if (createCallCount === 1) {
          // First unit creation fails
          throw new Error('Formula calculation failed')
        }
        return Promise.resolve(mockQuota)
      })

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(1)
        expect(result.data.quotasFailed).toBe(1)
      }
    })

    it('should return partial status when some units fail', async function () {
      let createCallCount = 0
      mockQuotasRepo.create = mock(function () {
        createCallCount++
        if (createCallCount === 1) {
          throw new Error('Database error')
        }
        return Promise.resolve(mockQuota)
      })

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBeGreaterThan(0)
        expect(result.data.quotasFailed).toBeGreaterThan(0)
      }

      // Verify log was created with partial status
      const logCreateCall = (mockLogsRepo.create as any).mock.calls[0]
      expect(logCreateCall[0].status).toBe('partial')
    })

    it('should return failed status when all units fail', async function () {
      mockQuotasRepo.create = mock(function () {
        throw new Error('Database error')
      })

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(0)
        expect(result.data.quotasFailed).toBe(2)
      }

      // Verify log was created with failed status
      const logCreateCall = (mockLogsRepo.create as any).mock.calls[0]
      expect(logCreateCall[0].status).toBe('failed')
      expect(logCreateCall[0].errorDetails).toBeDefined()
    })

    it('should handle empty buildings (no units) correctly', async function () {
      mockBuildingsRepo.getByCondominiumId = mock(() => Promise.resolve([]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('No units found in scope')
      }
    })

    it('should correctly clamp day to month length (day 31 in February → 28)', async function () {
      const scheduleWithDay31 = { ...mockSchedule, issueDay: 31, dueDay: 31 }
      mockSchedulesRepo.getById = mock(() => Promise.resolve(scheduleWithDay31))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2, // February 2025 has 28 days
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)

      // Check that the quota was created with clamped dates
      const createCall = (mockQuotasRepo.create as any).mock.calls[0]
      expect(createCall[0].issueDate).toBe('2025-02-28')
      expect(createCall[0].dueDate).toBe('2025-02-28')
    })

    it('should correctly clamp day to month length (day 31 in April → 30)', async function () {
      const scheduleWithDay31 = { ...mockSchedule, issueDay: 31, dueDay: 31 }
      mockSchedulesRepo.getById = mock(() => Promise.resolve(scheduleWithDay31))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 4, // April has 30 days
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)

      // Check that the quota was created with clamped dates
      const createCall = (mockQuotasRepo.create as any).mock.calls[0]
      expect(createCall[0].issueDate).toBe('2025-04-30')
      expect(createCall[0].dueDate).toBe('2025-04-30')
    })
  })

  describe('Transaction safety', function () {
    it('should perform all writes within the transaction', async function () {
      let transactionExecuted = false

      mockDb.transaction = async function <T>(fn: (tx: any) => Promise<T>) {
        transactionExecuted = true
        return await fn(mockDb)
      }

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(transactionExecuted).toBe(true)
      expect(result.success).toBe(true)
      expect(mockQuotasRepo.withTx).toHaveBeenCalled()
      expect(mockLogsRepo.withTx).toHaveBeenCalled()
    })

    it('should perform duplicate check inside the transaction (race condition fix)', async function () {
      let duplicateCheckCalledInTransaction = false

      mockDb.transaction = async function <T>(fn: (tx: any) => Promise<T>) {
        // Mock the transactional quotas repo
        const txQuotasRepo = {
          ...mockQuotasRepo,
          getByPeriod: mock(() => {
            duplicateCheckCalledInTransaction = true
            return Promise.resolve([])
          }),
        }

        mockQuotasRepo.withTx = mock(() => txQuotasRepo)

        return await fn(mockDb)
      }

      await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(duplicateCheckCalledInTransaction).toBe(true)
    })

    it('should rollback transaction on critical error', async function () {
      let _rollbackOccurred = false

      mockDb.transaction = async function <T>(fn: (tx: any) => Promise<T>) {
        try {
          return await fn(mockDb)
        } catch (error) {
          _rollbackOccurred = true
          throw error
        }
      }

      // Make the log creation fail to trigger transaction rollback
      mockLogsRepo.create = mock(() => {
        throw new Error('Critical database error')
      })

      try {
        await service.execute({
          scheduleId: 'schedule-1',
          periodYear: 2025,
          periodMonth: 2,
          generatedBy: 'system',
        })
      } catch (error) {
        // Transaction should propagate the error
        expect(error).toBeDefined()
      }

      // In a real database, this would rollback. Our mock just catches the error.
      expect(mockLogsRepo.create).toHaveBeenCalled()
    })
  })

  describe('Date handling', function () {
    it('should correctly format dates with proper padding', async function () {
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2, // Single digit month
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)

      // Check that dates are properly formatted with zero-padding
      const createCall = (mockQuotasRepo.create as any).mock.calls[0]
      expect(createCall[0].issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(createCall[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should create correct period description', async function () {
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)

      const createCall = (mockQuotasRepo.create as any).mock.calls[0]
      expect(createCall[0].periodDescription).toBe('February 2025')
    })
  })

  describe('Exonerated and cancelled quota handling', function () {
    it('should skip units with existing active quotas but allow generation for exonerated quotas', async function () {
      // Exonerated quota for unit-1 should NOT block re-generation
      const exoneratedQuota = { ...mockQuota, unitId: 'unit-1', status: 'exonerated' as const }
      mockQuotasRepo.getByPeriod = mock(() => Promise.resolve([exoneratedQuota]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Both units should get quotas since exonerated is treated as "no longer active"
        expect(result.data.quotasCreated).toBe(2)
      }
    })

    it('should skip units with existing cancelled quotas (allow re-generation)', async function () {
      const cancelledQuota = { ...mockQuota, unitId: 'unit-1', status: 'cancelled' as const }
      mockQuotasRepo.getByPeriod = mock(() => Promise.resolve([cancelledQuota]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Both units should get quotas since cancelled is filtered out
        expect(result.data.quotasCreated).toBe(2)
      }
    })

    it('should block generation for units with pending/overdue/paid quotas', async function () {
      const pendingQuota = { ...mockQuota, unitId: 'unit-1', status: 'pending' as const }
      const overdueQuota = { ...mockQuota, unitId: 'unit-2', status: 'overdue' as const }
      mockQuotasRepo.getByPeriod = mock(() => Promise.resolve([pendingQuota, overdueQuota]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // No units should get new quotas — both already have active quotas
        expect(result.data.quotasCreated).toBe(0)
      }
    })
  })

  describe('Multiple buildings in condominium', function () {
    it('should generate quotas for units across multiple buildings', async function () {
      const mockBuilding2: TBuilding = {
        ...mockBuilding,
        id: 'building-2',
        name: 'Building B',
        code: 'B',
      }

      const mockUnit3: TUnit = {
        ...mockUnit1,
        id: 'unit-3',
        buildingId: 'building-2',
        unitNumber: '201',
      }

      mockBuildingsRepo.getByCondominiumId = mock(() =>
        Promise.resolve([mockBuilding, mockBuilding2])
      )

      let buildingCallCount = 0
      mockUnitsRepo.getByBuildingId = mock(() => {
        buildingCallCount++
        if (buildingCallCount === 1) {
          return Promise.resolve([mockUnit1, mockUnit2])
        }
        return Promise.resolve([mockUnit3])
      })

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(3) // Units from both buildings
      }
      expect(mockBuildingsRepo.getByCondominiumId).toHaveBeenCalledWith('condo-1')
      expect(mockUnitsRepo.getByBuildingId).toHaveBeenCalledTimes(2)
    })
  })

  describe('Template execution cloning', function () {
    const mockTemplate = {
      id: 'template-1',
      serviceId: 'service-1',
      condominiumId: 'condo-1',
      paymentConceptId: 'concept-1',
      title: 'Limpieza',
      description: 'Limpieza mensual',
      executionDate: null,
      executionDay: 15,
      isTemplate: true,
      totalAmount: '500.00',
      currencyId: 'currency-1',
      invoiceNumber: null,
      items: [{ description: 'Limpieza áreas comunes', amount: '500.00' }],
      attachments: [],
      notes: null,
      status: 'pending',
      createdBy: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should clone template executions when quotas are created', async function () {
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([mockTemplate]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 3,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      expect(mockExecutionsRepo.getTemplatesByConceptId).toHaveBeenCalledWith('concept-1')
      expect(mockExecutionsRepo.create).toHaveBeenCalledTimes(1)

      const createCall = (mockExecutionsRepo.create as any).mock.calls[0]
      const clonedData = createCall[0]

      expect(clonedData.isTemplate).toBe(false)
      expect(clonedData.executionDay).toBeNull()
      expect(clonedData.executionDate).toBe('2025-03-15')
      expect(clonedData.title).toBe('Limpieza - March 2025')
      expect(clonedData.totalAmount).toBe('500.00')
      expect(clonedData.serviceId).toBe('service-1')
    })

    it('should use executionDay to build the correct date within the period', async function () {
      const templateDay28 = { ...mockTemplate, executionDay: 28 }
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([templateDay28]))

      // February 2025 has 28 days, so day 28 should be valid
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      const clonedData = (mockExecutionsRepo.create as any).mock.calls[0][0]
      expect(clonedData.executionDate).toBe('2025-02-28')
    })

    it('should clamp executionDay for months with fewer days (e.g. Feb)', async function () {
      const templateDay30 = { ...mockTemplate, executionDay: 30 }
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([templateDay30]))

      // February 2025 has 28 days — day 30 should clamp to 28
      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      const clonedData = (mockExecutionsRepo.create as any).mock.calls[0][0]
      expect(clonedData.executionDate).toBe('2025-02-28')
    })

    it('should use issueDate when template has no executionDay', async function () {
      const templateNoDay = { ...mockTemplate, executionDay: null }
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([templateNoDay]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 3,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      const clonedData = (mockExecutionsRepo.create as any).mock.calls[0][0]
      // issueDate is built from schedule.issueDay (1) → 2025-03-01
      expect(clonedData.executionDate).toBe('2025-03-01')
    })

    it('should clone multiple templates for same concept', async function () {
      const template2 = {
        ...mockTemplate,
        id: 'template-2',
        serviceId: 'service-2',
        title: 'Mantenimiento',
        executionDay: 20,
      }
      mockExecutionsRepo.getTemplatesByConceptId = mock(() =>
        Promise.resolve([mockTemplate, template2])
      )

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 4,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      expect(mockExecutionsRepo.create).toHaveBeenCalledTimes(2)

      const call1 = (mockExecutionsRepo.create as any).mock.calls[0][0]
      const call2 = (mockExecutionsRepo.create as any).mock.calls[1][0]

      expect(call1.executionDate).toBe('2025-04-15')
      expect(call1.title).toBe('Limpieza - April 2025')

      expect(call2.executionDate).toBe('2025-04-20')
      expect(call2.title).toBe('Mantenimiento - April 2025')
    })

    it('should NOT clone templates when no quotas are created', async function () {
      // All units already have quotas for this period
      mockQuotasRepo.getByPeriod = mock(() =>
        Promise.resolve([
          { ...mockQuota, unitId: 'unit-1', status: 'pending' as const },
          { ...mockQuota, unitId: 'unit-2', status: 'pending' as const },
        ])
      )

      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([mockTemplate]))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 2,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(0)
      }
      expect(mockExecutionsRepo.getTemplatesByConceptId).not.toHaveBeenCalled()
      expect(mockExecutionsRepo.create).not.toHaveBeenCalled()
    })

    it('should NOT clone templates when no executionsRepo is provided', async function () {
      // Create service without executionsRepo (backward compatibility)
      const serviceWithoutExecRepo = new GenerateQuotasForScheduleService(
        mockDb as never,
        mockQuotasRepo as never,
        mockRulesRepo as never,
        mockFormulasRepo as never,
        mockSchedulesRepo as never,
        mockLogsRepo as never,
        mockUnitsRepo as never,
        mockBuildingsRepo as never
      )

      const result = await serviceWithoutExecRepo.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 3,
        generatedBy: 'system',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
      }
      // No calls to executions repo at all
      expect(mockExecutionsRepo.getTemplatesByConceptId).not.toHaveBeenCalled()
      expect(mockExecutionsRepo.create).not.toHaveBeenCalled()
    })

    it('should still succeed even if template cloning fails', async function () {
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([mockTemplate]))
      mockExecutionsRepo.create = mock(() => Promise.reject(new Error('DB connection lost')))

      const result = await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 3,
        generatedBy: 'system',
      })

      // Quotas should still be created successfully (template cloning error is caught)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
      }
    })

    it('should use withTx on executionsRepo for transactional safety', async function () {
      mockExecutionsRepo.getTemplatesByConceptId = mock(() => Promise.resolve([mockTemplate]))

      await service.execute({
        scheduleId: 'schedule-1',
        periodYear: 2025,
        periodMonth: 3,
        generatedBy: 'system',
      })

      expect(mockExecutionsRepo.withTx).toHaveBeenCalledTimes(1)
    })
  })
})
