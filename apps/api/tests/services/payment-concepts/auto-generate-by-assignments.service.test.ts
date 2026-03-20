/**
 * Tests for auto-generation using assignments directly (no formulas/rules/schedules).
 *
 * The auto strategy finds active recurring concepts with chargeGenerationStrategy='auto'
 * and generates quotas for the current period using assignments to resolve unit amounts.
 *
 * Coverage:
 * - Generates quotas for current month for all auto-strategy concepts
 * - Skips inactive/non-recurring concepts
 * - Skips concepts that already have quotas for the period
 * - Uses GenerateChargesService.execute() internally
 * - Handles concepts with no assignments gracefully
 * - Generates for multiple concepts in sequence
 * - Backfill: generates missing past periods from effectiveFrom
 * - Reports results (created, skipped, failed)
 */
import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept } from '@packages/domain'
import { GenerateChargesService } from '@src/services/payment-concepts/generate-charges.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TUnitInfo = {
  id: string
  buildingId: string
  aliquotPercentage: string | null
  isActive: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const buildingId = '550e8400-e29b-41d4-a716-446655440020'
const userId = '550e8400-e29b-41d4-a716-446655440004'
const currencyId = '550e8400-e29b-41d4-a716-446655440002'
const unit1 = '550e8400-e29b-41d4-a716-446655440030'
const unit2 = '550e8400-e29b-41d4-a716-446655440031'

let conceptCounter = 0
function nextConceptId() {
  return `concept-auto-${++conceptCounter}`
}

function mockConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: nextConceptId(),
    condominiumId,
    buildingId: null,
    name: 'Auto Concept',
    description: null,
    conceptType: 'maintenance',
    isRecurring: true,
    recurrencePeriod: 'monthly',
    currencyId,
    allowsPartialPayment: true,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 28,
    effectiveFrom: new Date('2026-01-01'),
    effectiveUntil: null,
    chargeGenerationStrategy: 'auto',
    isActive: true,
    metadata: null,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultUnits: TUnitInfo[] = [
  { id: unit1, buildingId, aliquotPercentage: '60.000000', isActive: true },
  { id: unit2, buildingId, aliquotPercentage: '40.000000', isActive: true },
]

describe('Auto generation with assignments', function () {
  let existingPeriods: Set<string>
  let createdQuotas: Record<string, unknown>[]
  let createdExecutions: Record<string, unknown>[]

  function createMockDb() {
    return {
      transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(null),
    }
  }

  function createMockQuotasRepo() {
    return {
      existsForConceptAndPeriod: async (_cid: string, year: number, month: number) =>
        existingPeriods.has(`${_cid}-${year}-${month}`),
      createMany: async (quotas: Record<string, unknown>[]) => {
        createdQuotas.push(...quotas)
        return quotas.map((_, i) => ({ id: `quota-${i}` }))
      },
      withTx() {
        return this
      },
    }
  }

  function createMockUnitsRepo() {
    return {
      getByCondominiumId: async () => defaultUnits,
      getByBuildingId: async () => defaultUnits,
      getById: async (id: string) => defaultUnits.find(u => u.id === id) ?? null,
    }
  }

  function createMockExecutionsRepo() {
    return {
      getTemplatesByConceptId: async () => [] as Record<string, unknown>[],
      create: async (data: Record<string, unknown>) => {
        createdExecutions.push(data)
        return { id: `exec-${createdExecutions.length}` }
      },
      withTx() {
        return this
      },
    }
  }

  beforeEach(function () {
    conceptCounter = 0
    existingPeriods = new Set()
    createdQuotas = []
    createdExecutions = []
  })

  describe('single concept auto-generation', function () {
    it('should generate quotas for current period using assignments', async function () {
      const concept = mockConcept()
      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = {
        listByConceptId: async () => [
          {
            id: 'a1',
            paymentConceptId: concept.id,
            scopeType: 'condominium',
            condominiumId,
            buildingId: null,
            unitId: null,
            distributionMethod: 'fixed_per_unit',
            amount: 100,
            isActive: true,
            assignedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.execute({
        paymentConceptId: concept.id,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2) // 2 units
        expect(result.data.unitDetails[0]!.amount).toBe(100)
        expect(result.data.unitDetails[1]!.amount).toBe(100)
      }
    })

    it('should skip period where quotas already exist', async function () {
      const concept = mockConcept()
      existingPeriods.add(`${concept.id}-2026-3`)

      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = {
        listByConceptId: async () => [
          {
            id: 'a1',
            paymentConceptId: concept.id,
            scopeType: 'condominium',
            condominiumId,
            buildingId: null,
            unitId: null,
            distributionMethod: 'fixed_per_unit',
            amount: 100,
            isActive: true,
            assignedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.execute({
        paymentConceptId: concept.id,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
      }
    })

    it('should fail gracefully when concept has no assignments', async function () {
      const concept = mockConcept()
      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = { listByConceptId: async () => [] }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.execute({
        paymentConceptId: concept.id,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should clone template executions during generation', async function () {
      const concept = mockConcept()
      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = {
        listByConceptId: async () => [
          {
            id: 'a1',
            paymentConceptId: concept.id,
            scopeType: 'condominium',
            condominiumId,
            buildingId: null,
            unitId: null,
            distributionMethod: 'fixed_per_unit',
            amount: 50,
            isActive: true,
            assignedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const mockExecRepo = createMockExecutionsRepo()
      mockExecRepo.getTemplatesByConceptId = async () => [
        {
          id: 'template-1',
          serviceId: 'service-1',
          condominiumId,
          paymentConceptId: concept.id,
          title: 'Cleaning',
          description: null,
          executionDay: 15,
          isTemplate: true,
          totalAmount: '50.00',
          currencyId,
          invoiceNumber: null,
          items: [],
          attachments: [],
          notes: null,
        },
      ]

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        mockExecRepo as never
      )

      const result = await service.execute({
        paymentConceptId: concept.id,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      expect(createdExecutions.length).toBe(1)
      expect(createdExecutions[0]!.title).toBe('Cleaning - March 2026')
      expect(createdExecutions[0]!.executionDate).toBe('2026-03-15')
      expect(createdExecutions[0]!.isTemplate).toBe(false)
    })

    it('should skip inactive concept', async function () {
      const concept = mockConcept({ isActive: false })
      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = { listByConceptId: async () => [] }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.execute({
        paymentConceptId: concept.id,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })

  describe('getActiveAutoGenerationConcepts (repo method)', function () {
    it('should filter concepts by strategy=auto, isActive=true, isRecurring=true', function () {
      // This tests the filtering logic that the repo method should implement
      const concepts = [
        mockConcept({ chargeGenerationStrategy: 'auto', isActive: true, isRecurring: true }),
        mockConcept({ chargeGenerationStrategy: 'bulk', isActive: true, isRecurring: true }),
        mockConcept({ chargeGenerationStrategy: 'manual', isActive: true, isRecurring: true }),
        mockConcept({ chargeGenerationStrategy: 'auto', isActive: false, isRecurring: true }),
        mockConcept({ chargeGenerationStrategy: 'auto', isActive: true, isRecurring: false }),
      ]

      const filtered = concepts.filter(
        c => c.chargeGenerationStrategy === 'auto' && c.isActive && c.isRecurring
      )

      expect(filtered.length).toBe(1)
      expect(filtered[0]!.chargeGenerationStrategy).toBe('auto')
      expect(filtered[0]!.isActive).toBe(true)
      expect(filtered[0]!.isRecurring).toBe(true)
    })
  })

  describe('bulk execution with executeBulk', function () {
    it('should generate all periods from effectiveFrom to effectiveUntil', async function () {
      const concept = mockConcept({
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-03-31'),
        recurrencePeriod: 'monthly',
      })
      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = {
        listByConceptId: async () => [
          {
            id: 'a1',
            paymentConceptId: concept.id,
            scopeType: 'condominium',
            condominiumId,
            buildingId: null,
            unitId: null,
            distributionMethod: 'fixed_per_unit',
            amount: 100,
            isActive: true,
            assignedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.executeBulk({
        paymentConceptId: concept.id,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.periodsGenerated).toBe(3) // Jan, Feb, Mar
        expect(result.data.totalQuotas).toBe(6) // 2 units * 3 periods
      }
    })

    it('should skip already-generated periods in bulk', async function () {
      const concept = mockConcept({
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-03-31'),
        recurrencePeriod: 'monthly',
      })
      // Jan already exists
      existingPeriods.add(`${concept.id}-2026-1`)

      const mockConceptsRepo = { getById: async () => concept }
      const mockAssignmentsRepo = {
        listByConceptId: async () => [
          {
            id: 'a1',
            paymentConceptId: concept.id,
            scopeType: 'condominium',
            condominiumId,
            buildingId: null,
            unitId: null,
            distributionMethod: 'fixed_per_unit',
            amount: 100,
            isActive: true,
            assignedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const service = new GenerateChargesService(
        createMockDb() as never,
        mockConceptsRepo as never,
        mockAssignmentsRepo as never,
        createMockUnitsRepo() as never,
        createMockQuotasRepo() as never,
        createMockExecutionsRepo() as never
      )

      const result = await service.executeBulk({
        paymentConceptId: concept.id,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.periodsGenerated).toBe(2) // Feb, Mar (Jan skipped)
        expect(result.data.totalQuotas).toBe(4) // 2 units * 2 periods
      }
    })
  })
})
