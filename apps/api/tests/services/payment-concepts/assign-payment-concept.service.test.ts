import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept, TPaymentConceptAssignment, TPaymentConceptAssignmentCreate } from '@packages/domain'
import { AssignPaymentConceptService } from '@src/services/payment-concepts/assign-payment-concept.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockPaymentConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
}

type TMockAssignmentsRepo = {
  create: (data: Record<string, unknown>) => Promise<TPaymentConceptAssignment>
  getByConceptAndScope: (conceptId: string, scopeType: string, buildingId: string | null, unitId: string | null) => Promise<TPaymentConceptAssignment | null>
  update: (id: string, data: Record<string, unknown>) => Promise<TPaymentConceptAssignment | null>
}

type TMockBuildingsRepo = {
  getById: (id: string) => Promise<{ id: string; condominiumId: string; isActive: boolean } | null>
}

type TMockUnitsRepo = {
  getById: (id: string) => Promise<{ id: string; buildingId: string; isActive: boolean; aliquotPercentage: string | null } | null>
  getByBuildingId: (buildingId: string) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
  getByCondominiumId: (condominiumId: string) => Promise<{ id: string; aliquotPercentage: string | null; isActive: boolean }[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const conceptId = '550e8400-e29b-41d4-a716-446655440010'
const buildingId = '550e8400-e29b-41d4-a716-446655440020'
const unitId = '550e8400-e29b-41d4-a716-446655440030'
const userId = '550e8400-e29b-41d4-a716-446655440004'

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
    currencyId: '550e8400-e29b-41d4-a716-446655440002',
    allowsPartialPayment: true,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    effectiveFrom: null,
    effectiveUntil: null,
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

describe('AssignPaymentConceptService', function () {
  let service: AssignPaymentConceptService
  let mockConceptsRepo: TMockPaymentConceptsRepo
  let mockAssignmentsRepo: TMockAssignmentsRepo
  let mockBuildingsRepo: TMockBuildingsRepo
  let mockUnitsRepo: TMockUnitsRepo

  beforeEach(function () {
    mockConceptsRepo = {
      getById: async () => mockConcept(),
    }

    mockAssignmentsRepo = {
      create: async (data) => mockAssignment(data as Partial<TPaymentConceptAssignment>),
      getByConceptAndScope: async () => null,
      update: async (id, data) => mockAssignment({ id, ...data } as Partial<TPaymentConceptAssignment>),
    }

    mockBuildingsRepo = {
      getById: async () => ({ id: buildingId, condominiumId, isActive: true }),
    }

    mockUnitsRepo = {
      getById: async () => ({ id: unitId, buildingId, isActive: true, aliquotPercentage: '10.000000' }),
      getByBuildingId: async () => [
        { id: unitId, aliquotPercentage: '50.000000', isActive: true },
        { id: '550e8400-e29b-41d4-a716-446655440031', aliquotPercentage: '50.000000', isActive: true },
      ],
      getByCondominiumId: async () => [
        { id: unitId, aliquotPercentage: '50.000000', isActive: true },
        { id: '550e8400-e29b-41d4-a716-446655440031', aliquotPercentage: '50.000000', isActive: true },
      ],
    }

    service = new AssignPaymentConceptService(
      mockConceptsRepo as never,
      mockAssignmentsRepo as never,
      mockBuildingsRepo as never,
      mockUnitsRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Happy Paths
  // ─────────────────────────────────────────────────────────────────────────

  describe('happy paths', function () {
    it('should assign to condominium with by_aliquot', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 1000,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scopeType).toBe('condominium')
        expect(result.data.distributionMethod).toBe('by_aliquot')
      }
    })

    it('should assign to condominium with equal_split', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'equal_split',
        amount: 1000,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.distributionMethod).toBe('equal_split')
      }
    })

    it('should assign to condominium with fixed_per_unit', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'fixed_per_unit',
        amount: 50,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.distributionMethod).toBe('fixed_per_unit')
      }
    })

    it('should assign to building with by_aliquot', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'by_aliquot',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scopeType).toBe('building')
      }
    })

    it('should assign to building with equal_split', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'equal_split',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
    })

    it('should assign to building with fixed_per_unit', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'fixed_per_unit',
        amount: 100,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
    })

    it('should assign to unit with fixed_per_unit', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'unit',
        condominiumId,
        unitId,
        distributionMethod: 'fixed_per_unit',
        amount: 75,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scopeType).toBe('unit')
        expect(result.data.distributionMethod).toBe('fixed_per_unit')
      }
    })

    it('should deactivate an assignment', async function () {
      mockAssignmentsRepo.update = async (id) => mockAssignment({ id, isActive: false })

      const result = await service.deactivate('550e8400-e29b-41d4-a716-446655440050')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isActive).toBe(false)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('validation errors', function () {
    it('should fail when amount is 0 or negative', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 0,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when scope=unit with distributionMethod != fixed_per_unit', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'unit',
        condominiumId,
        unitId,
        distributionMethod: 'by_aliquot',
        amount: 50,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when scope=building without buildingId', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when scope=unit without unitId', async function () {
      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'unit',
        condominiumId,
        distributionMethod: 'fixed_per_unit',
        amount: 50,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when building is not in concepts condominium', async function () {
      mockBuildingsRepo.getById = async () => ({ id: buildingId, condominiumId: '550e8400-e29b-41d4-a716-446655440099', isActive: true })

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'by_aliquot',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when duplicate assignment exists', async function () {
      mockAssignmentsRepo.getByConceptAndScope = async () => mockAssignment()

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 1000,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
      }
    })

    it('should fail when concept does not exist', async function () {
      mockConceptsRepo.getById = async () => null

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 1000,
        assignedBy: userId,
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
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 1000,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when unit is inactive', async function () {
      mockUnitsRepo.getById = async () => ({ id: unitId, buildingId, isActive: false, aliquotPercentage: '10.000000' })

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'unit',
        condominiumId,
        unitId,
        distributionMethod: 'fixed_per_unit',
        amount: 50,
        assignedBy: userId,
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
    it('should fail when by_aliquot but no units have aliquot set', async function () {
      mockUnitsRepo.getByCondominiumId = async () => [
        { id: unitId, aliquotPercentage: null, isActive: true },
      ]

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'condominium',
        condominiumId,
        distributionMethod: 'by_aliquot',
        amount: 1000,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when by_aliquot to building with no active units', async function () {
      mockUnitsRepo.getByBuildingId = async () => []

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'by_aliquot',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when equal_split to building with no active units', async function () {
      mockUnitsRepo.getByBuildingId = async () => []

      const result = await service.execute({
        paymentConceptId: conceptId,
        scopeType: 'building',
        condominiumId,
        buildingId,
        distributionMethod: 'equal_split',
        amount: 500,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })
})
