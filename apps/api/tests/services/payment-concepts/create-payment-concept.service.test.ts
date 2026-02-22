import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept, TPaymentConceptCreate } from '@packages/domain'
import { CreatePaymentConceptService } from '@src/services/payment-concepts/create-payment-concept.service'
import { type TServiceResult } from '@src/services/base.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockPaymentConceptsRepo = {
  create: (data: TPaymentConceptCreate) => Promise<TPaymentConcept>
}

type TMockCondominiumsRepo = {
  getById: (id: string) => Promise<{ id: string; name: string } | null>
}

type TMockCurrenciesRepo = {
  getById: (id: string) => Promise<{ id: string; code: string } | null>
}

type TMockCondominiumMCRepo = {
  getByCondominiumAndMC: (condominiumId: string, mcId: string) => Promise<{ id: string } | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Constants
// ─────────────────────────────────────────────────────────────────────────────

const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const currencyId = '550e8400-e29b-41d4-a716-446655440002'
const mcId = '550e8400-e29b-41d4-a716-446655440003'
const userId = '550e8400-e29b-41d4-a716-446655440004'

function mockPaymentConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: '550e8400-e29b-41d4-a716-446655440010',
    condominiumId,
    buildingId: null,
    name: 'Monthly Maintenance',
    description: 'Regular maintenance fee',
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

function createInput(overrides: Partial<TPaymentConceptCreate & { managementCompanyId: string; createdBy: string }> = {}) {
  return {
    condominiumId,
    buildingId: null,
    name: 'Monthly Maintenance',
    description: 'Regular maintenance fee',
    conceptType: 'maintenance' as const,
    isRecurring: true,
    recurrencePeriod: 'monthly' as const,
    currencyId,
    allowsPartialPayment: true,
    latePaymentType: 'none' as const,
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none' as const,
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    isActive: true,
    metadata: null,
    createdBy: userId,
    managementCompanyId: mcId,
    ...overrides,
  }
}

describe('CreatePaymentConceptService', function () {
  let service: CreatePaymentConceptService
  let mockPaymentConceptsRepo: TMockPaymentConceptsRepo
  let mockCondominiumsRepo: TMockCondominiumsRepo
  let mockCurrenciesRepo: TMockCurrenciesRepo
  let mockCondominiumMCRepo: TMockCondominiumMCRepo

  beforeEach(function () {
    mockPaymentConceptsRepo = {
      create: async (data: TPaymentConceptCreate) => mockPaymentConcept(data as Partial<TPaymentConcept>),
    }

    mockCondominiumsRepo = {
      getById: async () => ({ id: condominiumId, name: 'Test Condo' }),
    }

    mockCurrenciesRepo = {
      getById: async () => ({ id: currencyId, code: 'USD' }),
    }

    mockCondominiumMCRepo = {
      getByCondominiumAndMC: async () => ({ id: '550e8400-e29b-41d4-a716-446655440099' }),
    }

    service = new CreatePaymentConceptService(
      mockPaymentConceptsRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockCondominiumMCRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Happy Paths
  // ─────────────────────────────────────────────────────────────────────────

  describe('happy paths', function () {
    it('should create concept with minimal required fields', async function () {
      const result = await service.execute(createInput())

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Monthly Maintenance')
        expect(result.data.conceptType).toBe('maintenance')
        expect(result.data.condominiumId).toBe(condominiumId)
        expect(result.data.currencyId).toBe(currencyId)
      }
    })

    it('should create recurring concept with full config', async function () {
      const input = createInput({
        isRecurring: true,
        recurrencePeriod: 'monthly',
        issueDay: 1,
        dueDay: 15,
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 5,
        earlyPaymentDaysBeforeDue: 10,
      })

      const result = await service.execute(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isRecurring).toBe(true)
        expect(result.data.recurrencePeriod).toBe('monthly')
        expect(result.data.issueDay).toBe(1)
        expect(result.data.dueDay).toBe(15)
      }
    })

    it('should create one-time concept without recurrence fields', async function () {
      const input = createInput({
        isRecurring: false,
        recurrencePeriod: null,
        issueDay: null,
        dueDay: null,
        conceptType: 'extraordinary',
      })

      const result = await service.execute(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isRecurring).toBe(false)
      }
    })

    it('should create concept with allowsPartialPayment=false', async function () {
      const input = createInput({ allowsPartialPayment: false })

      const result = await service.execute(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.allowsPartialPayment).toBe(false)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('validation errors', function () {
    it('should fail when name is empty', async function () {
      const result = await service.execute(createInput({ name: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when condominiumId is missing', async function () {
      const result = await service.execute(createInput({ condominiumId: null }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept is missing recurrencePeriod', async function () {
      const result = await service.execute(createInput({
        isRecurring: true,
        recurrencePeriod: null,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept is missing issueDay', async function () {
      const result = await service.execute(createInput({
        isRecurring: true,
        issueDay: null,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept is missing dueDay', async function () {
      const result = await service.execute(createInput({
        isRecurring: true,
        dueDay: null,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when issueDay is 0', async function () {
      const result = await service.execute(createInput({ issueDay: 0 }))
      expect(result.success).toBe(false)
    })

    it('should fail when issueDay is 29', async function () {
      const result = await service.execute(createInput({ issueDay: 29 }))
      expect(result.success).toBe(false)
    })

    it('should fail when dueDay is 0', async function () {
      const result = await service.execute(createInput({ dueDay: 0 }))
      expect(result.success).toBe(false)
    })

    it('should fail when latePaymentType is percentage with value 0', async function () {
      const result = await service.execute(createInput({
        latePaymentType: 'percentage',
        latePaymentValue: 0,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when latePaymentType is percentage with value over 100', async function () {
      const result = await service.execute(createInput({
        latePaymentType: 'percentage',
        latePaymentValue: 150,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when latePaymentType is fixed with negative value', async function () {
      const result = await service.execute(createInput({
        latePaymentType: 'fixed',
        latePaymentValue: -5,
      }))
      expect(result.success).toBe(false)
    })

    it('should succeed when latePaymentType is none even with value set', async function () {
      const result = await service.execute(createInput({
        latePaymentType: 'none',
        latePaymentValue: 50,
      }))
      expect(result.success).toBe(true)
    })

    it('should fail when earlyPaymentType is percentage with daysBeforeDue=0', async function () {
      const result = await service.execute(createInput({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 5,
        earlyPaymentDaysBeforeDue: 0,
      }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when earlyPaymentType is percentage with value over 100', async function () {
      const result = await service.execute(createInput({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 150,
        earlyPaymentDaysBeforeDue: 10,
      }))
      expect(result.success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Entity Validation
  // ─────────────────────────────────────────────────────────────────────────

  describe('entity validation', function () {
    it('should fail when condominium does not exist', async function () {
      mockCondominiumsRepo.getById = async () => null

      const result = await service.execute(createInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when condominium does not belong to user MC', async function () {
      mockCondominiumMCRepo.getByCondominiumAndMC = async () => null

      const result = await service.execute(createInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when currency does not exist', async function () {
      mockCurrenciesRepo.getById = async () => null

      const result = await service.execute(createInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })
  })
})
