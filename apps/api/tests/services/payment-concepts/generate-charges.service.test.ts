import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept, TPaymentConceptAssignment } from '@packages/domain'
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

type TMockPaymentConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
}

type TMockAssignmentsRepo = {
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptAssignment[]>
}

type TMockUnitsRepo = {
  getByCondominiumId: (condominiumId: string) => Promise<TUnitInfo[]>
  getByBuildingId: (buildingId: string) => Promise<TUnitInfo[]>
  getById: (id: string) => Promise<TUnitInfo | null>
}

type TMockQuotasRepo = {
  existsForConceptAndPeriod: (conceptId: string, year: number, month: number) => Promise<boolean>
  createMany: (quotas: Record<string, unknown>[]) => Promise<{ id: string }[]>
}

type TMockDb = {
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const conceptId = '550e8400-e29b-41d4-a716-446655440010'
const buildingId = '550e8400-e29b-41d4-a716-446655440020'
const userId = '550e8400-e29b-41d4-a716-446655440004'
const currencyId = '550e8400-e29b-41d4-a716-446655440002'

const unit1 = '550e8400-e29b-41d4-a716-446655440030'
const unit2 = '550e8400-e29b-41d4-a716-446655440031'
const unit3 = '550e8400-e29b-41d4-a716-446655440032'

function mockConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: conceptId,
    condominiumId,
    buildingId: null,
    name: 'Monthly Maintenance',
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
    dueDay: 15,
    isActive: true,
    metadata: null,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockAssignment(overrides: Partial<TPaymentConceptAssignment> = {}): TPaymentConceptAssignment {
  return {
    id: '550e8400-e29b-41d4-a716-446655440050',
    paymentConceptId: conceptId,
    scopeType: 'condominium',
    condominiumId,
    buildingId: null,
    unitId: null,
    distributionMethod: 'by_aliquot',
    amount: 1000,
    isActive: true,
    assignedBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('GenerateChargesService', function () {
  let service: GenerateChargesService
  let mockConceptsRepo: TMockPaymentConceptsRepo
  let mockAssignmentsRepo: TMockAssignmentsRepo
  let mockUnitsRepo: TMockUnitsRepo
  let mockQuotasRepo: TMockQuotasRepo
  let mockDb: TMockDb
  let createdQuotas: Record<string, unknown>[]

  beforeEach(function () {
    createdQuotas = []

    mockConceptsRepo = {
      getById: async () => mockConcept(),
    }

    mockAssignmentsRepo = {
      listByConceptId: async () => [
        mockAssignment({
          scopeType: 'condominium',
          distributionMethod: 'by_aliquot',
          amount: 1000,
        }),
      ],
    }

    mockUnitsRepo = {
      getByCondominiumId: async () => [
        { id: unit1, buildingId, aliquotPercentage: '60.000000', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '40.000000', isActive: true },
      ],
      getByBuildingId: async () => [
        { id: unit1, buildingId, aliquotPercentage: '60.000000', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '40.000000', isActive: true },
      ],
      getById: async (id) => ({
        id,
        buildingId,
        aliquotPercentage: '100.000000',
        isActive: true,
      }),
    }

    mockQuotasRepo = {
      existsForConceptAndPeriod: async () => false,
      createMany: async (quotas) => {
        createdQuotas = quotas
        return quotas.map((_, i) => ({ id: `quota-${i}` }))
      },
    }

    mockDb = {
      transaction: async (fn) => fn(null),
    }

    service = new GenerateChargesService(
      mockDb as never,
      mockConceptsRepo as never,
      mockAssignmentsRepo as never,
      mockUnitsRepo as never,
      mockQuotasRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // by_aliquot
  // ─────────────────────────────────────────────────────────────────────────

  describe('by_aliquot distribution', function () {
    it('should generate quotas proportional to aliquot for condominium', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        // unit1: 60%, unit2: 40% of 1000
        const amounts = result.data.unitDetails.map((d: { amount: number }) => d.amount)
        expect(amounts).toContain(600)
        expect(amounts).toContain(400)
      }
    })

    it('should verify amounts sum to total', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const totalGenerated = result.data.unitDetails.reduce(
          (sum: number, d: { amount: number }) => sum + d.amount, 0
        )
        expect(totalGenerated).toBeCloseTo(1000, 2)
      }
    })

    it('should generate for building-wide by_aliquot only for that buildings units', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'building',
          buildingId,
          distributionMethod: 'by_aliquot',
          amount: 500,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        const totalGenerated = result.data.unitDetails.reduce(
          (sum: number, d: { amount: number }) => sum + d.amount, 0
        )
        expect(totalGenerated).toBeCloseTo(500, 2)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // equal_split
  // ─────────────────────────────────────────────────────────────────────────

  describe('equal_split distribution', function () {
    it('should divide total equally among units for condominium', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'condominium',
          distributionMethod: 'equal_split',
          amount: 1000,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        // 1000 / 2 = 500 each
        result.data.unitDetails.forEach((d: { amount: number }) => {
          expect(d.amount).toBe(500)
        })
      }
    })

    it('should handle rounding for equal_split with 3 units', async function () {
      mockUnitsRepo.getByCondominiumId = async () => [
        { id: unit1, buildingId, aliquotPercentage: '33.333333', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '33.333333', isActive: true },
        { id: unit3, buildingId, aliquotPercentage: '33.333334', isActive: true },
      ]

      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'condominium',
          distributionMethod: 'equal_split',
          amount: 100,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(3)
        const totalGenerated = result.data.unitDetails.reduce(
          (sum: number, d: { amount: number }) => sum + d.amount, 0
        )
        // Sum must equal exactly 100 (penny adjustment on last unit)
        expect(totalGenerated).toBeCloseTo(100, 2)
      }
    })

    it('should divide among building units for building-wide equal_split', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'building',
          buildingId,
          distributionMethod: 'equal_split',
          amount: 500,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        result.data.unitDetails.forEach((d: { amount: number }) => {
          expect(d.amount).toBe(250)
        })
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // fixed_per_unit
  // ─────────────────────────────────────────────────────────────────────────

  describe('fixed_per_unit distribution', function () {
    it('should assign exact amount to each unit for condominium-wide', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'condominium',
          distributionMethod: 'fixed_per_unit',
          amount: 50,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        result.data.unitDetails.forEach((d: { amount: number }) => {
          expect(d.amount).toBe(50)
        })
      }
    })

    it('should assign exact amount to unit-specific assignment', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'unit',
          unitId: unit1,
          distributionMethod: 'fixed_per_unit',
          amount: 75,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(1)
        expect(result.data.unitDetails[0]!.amount).toBe(75)
        expect(result.data.unitDetails[0]!.unitId).toBe(unit1)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Mixed & Override Priority
  // ─────────────────────────────────────────────────────────────────────────

  describe('override priority', function () {
    it('should use unit-specific override instead of condominium-wide for that unit', async function () {
      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          id: '550e8400-e29b-41d4-a716-446655440050',
          scopeType: 'condominium',
          distributionMethod: 'fixed_per_unit',
          amount: 100,
        }),
        mockAssignment({
          id: '550e8400-e29b-41d4-a716-446655440051',
          scopeType: 'unit',
          unitId: unit1,
          distributionMethod: 'fixed_per_unit',
          amount: 200,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotasCreated).toBe(2)
        const unit1Detail = result.data.unitDetails.find((d: { unitId: string }) => d.unitId === unit1)
        const unit2Detail = result.data.unitDetails.find((d: { unitId: string }) => d.unitId === unit2)
        expect(unit1Detail!.amount).toBe(200) // overridden
        expect(unit2Detail!.amount).toBe(100) // from condominium-wide
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('validation errors', function () {
    it('should fail when concept does not exist', async function () {
      mockConceptsRepo.getById = async () => null

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when concept is inactive', async function () {
      mockConceptsRepo.getById = async () => mockConcept({ isActive: false })

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when quotas already exist for this period', async function () {
      mockQuotasRepo.existsForConceptAndPeriod = async () => true

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
      }
    })

    it('should fail when no active assignments exist', async function () {
      mockAssignmentsRepo.listByConceptId = async () => []

      const result = await service.execute({
        paymentConceptId: conceptId,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', function () {
    it('should skip inactive units', async function () {
      mockUnitsRepo.getByCondominiumId = async () => [
        { id: unit1, buildingId, aliquotPercentage: '60.000000', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '40.000000', isActive: false },
      ]

      mockAssignmentsRepo.listByConceptId = async () => [
        mockAssignment({
          scopeType: 'condominium',
          distributionMethod: 'by_aliquot',
          amount: 1000,
        }),
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Only unit1 active, gets full amount
        expect(result.data.quotasCreated).toBe(1)
        expect(result.data.unitDetails[0]!.amount).toBe(1000)
      }
    })

    it('should handle unit with 0 aliquot in proportional (excluded)', async function () {
      mockUnitsRepo.getByCondominiumId = async () => [
        { id: unit1, buildingId, aliquotPercentage: '100.000000', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '0.000000', isActive: true },
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // unit2 has 0% aliquot, excluded from proportional distribution
        expect(result.data.quotasCreated).toBe(1)
        expect(result.data.unitDetails[0]!.amount).toBe(1000)
      }
    })

    it('should handle rounding with penny adjustment for by_aliquot', async function () {
      mockUnitsRepo.getByCondominiumId = async () => [
        { id: unit1, buildingId, aliquotPercentage: '33.333333', isActive: true },
        { id: unit2, buildingId, aliquotPercentage: '33.333333', isActive: true },
        { id: unit3, buildingId, aliquotPercentage: '33.333334', isActive: true },
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const totalGenerated = result.data.unitDetails.reduce(
          (sum: number, d: { amount: number }) => sum + d.amount, 0
        )
        // Must sum to exactly 1000 regardless of rounding
        expect(totalGenerated).toBeCloseTo(1000, 2)
      }
    })

    it('should create quotas with correct dates from issueDay/dueDay', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // With issueDay=1, dueDay=15, period March 2026
        expect(result.data.issueDate).toBe('2026-03-01')
        expect(result.data.dueDate).toBe('2026-03-15')
      }
    })

    it('should set dueDate to next month when dueDay < issueDay', async function () {
      mockConceptsRepo.getById = async () => mockConcept({ issueDay: 25, dueDay: 5 })

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.issueDate).toBe('2026-03-25')
        expect(result.data.dueDate).toBe('2026-04-05')
      }
    })

    it('should wrap dueDate to January of next year when dueDay < issueDay in December', async function () {
      mockConceptsRepo.getById = async () => mockConcept({ issueDay: 28, dueDay: 5 })

      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 12,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.issueDate).toBe('2026-12-28')
        expect(result.data.dueDate).toBe('2027-01-05')
      }
    })

    it('should create quotas with status pending and balance equal to amount', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        periodYear: 2026,
        periodMonth: 3,
        generatedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Each quota should have status='pending' and balance = baseAmount
        expect(createdQuotas.length).toBeGreaterThan(0)
        createdQuotas.forEach(q => {
          expect(q.status).toBe('pending')
          expect(q.balance).toBe(q.baseAmount)
        })
      }
    })
  })
})
