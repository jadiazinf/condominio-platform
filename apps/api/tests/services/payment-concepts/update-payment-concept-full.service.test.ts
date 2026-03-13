import { describe, it, expect, beforeEach } from 'bun:test'
import type {
  TPaymentConcept,
  TPaymentConceptAssignment,
  TPaymentConceptBankAccount,
  TPaymentConceptChange,
} from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// The service under test (will be implemented after tests)
// ─────────────────────────────────────────────────────────────────────────────

import {
  UpdatePaymentConceptFullService,
  type IUpdatePaymentConceptFullInput,
} from '@src/services/payment-concepts/update-payment-concept-full.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockPaymentConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
  update: (id: string, data: Partial<TPaymentConcept>) => Promise<TPaymentConcept>
  withTx: (tx: unknown) => TMockPaymentConceptsRepo
}

type TMockAssignmentsRepo = {
  listByConceptId: (conceptId: string, activeOnly?: boolean) => Promise<TPaymentConceptAssignment[]>
  deactivateAllByConceptId: (conceptId: string) => Promise<number>
  create: (data: unknown) => Promise<TPaymentConceptAssignment>
  withTx: (tx: unknown) => TMockAssignmentsRepo
}

type TMockBankAccountsRepo = {
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptBankAccount[]>
  linkBankAccount: (conceptId: string, bankAccountId: string, assignedBy: string | null) => Promise<TPaymentConceptBankAccount>
  unlinkBankAccount: (conceptId: string, bankAccountId: string) => Promise<boolean>
  withTx: (tx: unknown) => TMockBankAccountsRepo
}

type TMockConceptServicesRepo = {
  listByConceptId: (conceptId: string) => Promise<Array<{ id: string; serviceId: string; amount: number; useDefaultAmount: boolean }>>
  linkService: (conceptId: string, serviceId: string, amount: number, useDefault: boolean) => Promise<unknown>
  unlinkService: (conceptId: string, serviceId: string) => Promise<boolean>
  withTx: (tx: unknown) => TMockConceptServicesRepo
}

type TMockChangesRepo = {
  create: (data: unknown) => Promise<TPaymentConceptChange>
  withTx: (tx: unknown) => TMockChangesRepo
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

type TMockDb = {
  transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Constants
// ─────────────────────────────────────────────────────────────────────────────

const conceptId = '550e8400-e29b-41d4-a716-446655440010'
const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const currencyId = '550e8400-e29b-41d4-a716-446655440002'
const mcId = '550e8400-e29b-41d4-a716-446655440003'
const userId = '550e8400-e29b-41d4-a716-446655440004'
const bankAccountId1 = '550e8400-e29b-41d4-a716-446655440020'
const bankAccountId2 = '550e8400-e29b-41d4-a716-446655440021'
const serviceId1 = '550e8400-e29b-41d4-a716-446655440030'
const assignmentId1 = '550e8400-e29b-41d4-a716-446655440040'

// ─────────────────────────────────────────────────────────────────────────────
// Factory Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mockPaymentConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: conceptId,
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
    effectiveFrom: null,
    effectiveUntil: null,
    chargeGenerationStrategy: 'auto',
    isActive: true,
    metadata: null,
    createdBy: userId,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function mockAssignment(overrides: Partial<TPaymentConceptAssignment> = {}): TPaymentConceptAssignment {
  return {
    id: assignmentId1,
    paymentConceptId: conceptId,
    scopeType: 'condominium',
    condominiumId,
    buildingId: null,
    unitId: null,
    distributionMethod: 'equal_split',
    amount: 100,
    isActive: true,
    assignedBy: userId,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function mockBankAccount(overrides: Partial<TPaymentConceptBankAccount> = {}): TPaymentConceptBankAccount {
  return {
    id: '550e8400-e29b-41d4-a716-446655440050',
    paymentConceptId: conceptId,
    bankAccountId: bankAccountId1,
    assignedBy: userId,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function createUpdateInput(overrides: Partial<IUpdatePaymentConceptFullInput> = {}): IUpdatePaymentConceptFullInput {
  return {
    conceptId,
    managementCompanyId: mcId,
    changedBy: userId,
    notes: null,
    // Concept base fields
    name: 'Updated Maintenance',
    description: 'Updated description',
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
    effectiveFrom: null,
    effectiveUntil: null,
    chargeGenerationStrategy: 'auto',
    isActive: true,
    metadata: null,
    // Related entities (optional — if not provided, no changes to those)
    assignments: undefined,
    bankAccountIds: undefined,
    services: undefined,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('UpdatePaymentConceptFullService', function () {
  let service: UpdatePaymentConceptFullService
  let mockDb: TMockDb
  let mockConceptsRepo: TMockPaymentConceptsRepo
  let mockAssignmentsRepo: TMockAssignmentsRepo
  let mockBankAccountsRepo: TMockBankAccountsRepo
  let mockConceptServicesRepo: TMockConceptServicesRepo
  let mockChangesRepo: TMockChangesRepo
  let mockCondominiumsRepo: TMockCondominiumsRepo
  let mockCurrenciesRepo: TMockCurrenciesRepo
  let mockCondominiumMCRepo: TMockCondominiumMCRepo

  beforeEach(function () {
    const existingConcept = mockPaymentConcept()

    mockConceptsRepo = {
      getById: async () => existingConcept,
      update: async (_id, data) => mockPaymentConcept({ ...data } as Partial<TPaymentConcept>),
      withTx: () => mockConceptsRepo,
    }

    mockAssignmentsRepo = {
      listByConceptId: async () => [mockAssignment()],
      deactivateAllByConceptId: async () => 1,
      create: async (data) => mockAssignment(data as Partial<TPaymentConceptAssignment>),
      withTx: () => mockAssignmentsRepo,
    }

    mockBankAccountsRepo = {
      listByConceptId: async () => [mockBankAccount()],
      linkBankAccount: async (cId, baId, by) => mockBankAccount({ bankAccountId: baId }),
      unlinkBankAccount: async () => true,
      withTx: () => mockBankAccountsRepo,
    }

    mockConceptServicesRepo = {
      listByConceptId: async () => [],
      linkService: async () => ({}),
      unlinkService: async () => true,
      withTx: () => mockConceptServicesRepo,
    }

    mockChangesRepo = {
      create: async (data) => ({
        id: '550e8400-e29b-41d4-a716-446655440060',
        paymentConceptId: conceptId,
        condominiumId,
        changedBy: userId,
        previousValues: {},
        newValues: {},
        notes: null,
        createdAt: new Date(),
        ...(data as object),
      }),
      withTx: () => mockChangesRepo,
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

    // Mock db.transaction — just executes the callback passing db itself as tx
    mockDb = {
      transaction: async (fn) => fn(mockDb),
    }

    service = new UpdatePaymentConceptFullService(
      mockDb as never,
      mockConceptsRepo as never,
      mockAssignmentsRepo as never,
      mockBankAccountsRepo as never,
      mockConceptServicesRepo as never,
      mockChangesRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockCondominiumMCRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Happy Paths
  // ─────────────────────────────────────────────────────────────────────────

  describe('happy paths', function () {
    it('should update concept base fields and record change', async function () {
      const input = createUpdateInput({ name: 'New Name', description: 'New desc' })
      const result = await service.execute(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('New Name')
      }
    })

    it('should update late payment config', async function () {
      const input = createUpdateInput({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should update early payment config', async function () {
      const input = createUpdateInput({
        earlyPaymentType: 'fixed',
        earlyPaymentValue: 50,
        earlyPaymentDaysBeforeDue: 10,
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should switch from recurring to one-time', async function () {
      const input = createUpdateInput({
        isRecurring: false,
        recurrencePeriod: null,
        issueDay: null,
        dueDay: null,
        conceptType: 'extraordinary',
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should update assignments when provided', async function () {
      let deactivateCalled = false
      let createCalled = false
      mockAssignmentsRepo.deactivateAllByConceptId = async () => {
        deactivateCalled = true
        return 1
      }
      mockAssignmentsRepo.create = async (data) => {
        createCalled = true
        return mockAssignment(data as Partial<TPaymentConceptAssignment>)
      }

      const input = createUpdateInput({
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId,
            distributionMethod: 'equal_split',
            amount: 200,
          },
        ],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
      expect(deactivateCalled).toBe(true)
      expect(createCalled).toBe(true)
    })

    it('should sync bank accounts — add new, remove old', async function () {
      let unlinkedAccount = ''
      let linkedAccount = ''

      // Existing: bankAccountId1, new input: bankAccountId2
      mockBankAccountsRepo.unlinkBankAccount = async (_cId, baId) => {
        unlinkedAccount = baId
        return true
      }
      mockBankAccountsRepo.linkBankAccount = async (_cId, baId, _by) => {
        linkedAccount = baId
        return mockBankAccount({ bankAccountId: baId })
      }

      const input = createUpdateInput({
        bankAccountIds: [bankAccountId2],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
      expect(unlinkedAccount).toBe(bankAccountId1)
      expect(linkedAccount).toBe(bankAccountId2)
    })

    it('should sync services — add new, remove old', async function () {
      let unlinkedServiceId = ''
      let linkedServiceId = ''

      mockConceptServicesRepo.listByConceptId = async () => [
        { id: 'link1', serviceId: serviceId1, amount: 50, useDefaultAmount: true },
      ]
      mockConceptServicesRepo.unlinkService = async (_cId, sId) => {
        unlinkedServiceId = sId
        return true
      }
      const newServiceId = '550e8400-e29b-41d4-a716-446655440031'
      mockConceptServicesRepo.linkService = async (_cId, sId) => {
        linkedServiceId = sId
        return {}
      }

      const input = createUpdateInput({
        services: [
          { serviceId: newServiceId, amount: 100, useDefaultAmount: false },
        ],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
      expect(unlinkedServiceId).toBe(serviceId1)
      expect(linkedServiceId).toBe(newServiceId)
    })

    it('should record change log with previous and new values', async function () {
      let savedChange: Record<string, unknown> | null = null

      mockChangesRepo.create = async (data) => {
        savedChange = data as Record<string, unknown>
        return {
          id: '550e8400-e29b-41d4-a716-446655440060',
          paymentConceptId: conceptId,
          condominiumId,
          changedBy: userId,
          previousValues: (data as Record<string, unknown>).previousValues as Record<string, unknown>,
          newValues: (data as Record<string, unknown>).newValues as Record<string, unknown>,
          notes: null,
          createdAt: new Date(),
        }
      }

      const input = createUpdateInput({ name: 'Changed Name' })
      const result = await service.execute(input)

      expect(result.success).toBe(true)
      expect(savedChange).not.toBeNull()
      expect(savedChange!.paymentConceptId).toBe(conceptId)
      expect(savedChange!.changedBy).toBe(userId)
      expect((savedChange!.previousValues as Record<string, unknown>).name).toBe('Monthly Maintenance')
      expect((savedChange!.newValues as Record<string, unknown>).name).toBe('Changed Name')
    })

    it('should save notes in change log when provided', async function () {
      let savedNotes = ''
      mockChangesRepo.create = async (data) => {
        savedNotes = (data as Record<string, unknown>).notes as string
        return {
          id: '550e8400-e29b-41d4-a716-446655440060',
          paymentConceptId: conceptId,
          condominiumId,
          changedBy: userId,
          previousValues: {},
          newValues: {},
          notes: savedNotes,
          createdAt: new Date(),
        }
      }

      const input = createUpdateInput({
        name: 'Changed',
        notes: 'Ajuste por asamblea de copropietarios',
      })
      await service.execute(input)

      expect(savedNotes).toBe('Ajuste por asamblea de copropietarios')
    })

    it('should not touch assignments when not provided in input', async function () {
      let deactivateCalled = false
      mockAssignmentsRepo.deactivateAllByConceptId = async () => {
        deactivateCalled = true
        return 0
      }

      const input = createUpdateInput({ name: 'Just rename' })
      // assignments is undefined by default
      const result = await service.execute(input)

      expect(result.success).toBe(true)
      expect(deactivateCalled).toBe(false)
    })

    it('should not touch bank accounts when not provided in input', async function () {
      let unlinkCalled = false
      mockBankAccountsRepo.unlinkBankAccount = async () => {
        unlinkCalled = true
        return true
      }

      const input = createUpdateInput({ name: 'Just rename' })
      const result = await service.execute(input)

      expect(result.success).toBe(true)
      expect(unlinkCalled).toBe(false)
    })

    it('should not touch services when not provided in input', async function () {
      let unlinkCalled = false
      mockConceptServicesRepo.unlinkService = async () => {
        unlinkCalled = true
        return true
      }

      const input = createUpdateInput({ name: 'Just rename' })
      const result = await service.execute(input)

      expect(result.success).toBe(true)
      expect(unlinkCalled).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('validation errors', function () {
    it('should fail when concept does not exist', async function () {
      mockConceptsRepo.getById = async () => null

      const result = await service.execute(createUpdateInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when condominium does not exist', async function () {
      mockCondominiumsRepo.getById = async () => null

      const result = await service.execute(createUpdateInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when condominium does not belong to MC', async function () {
      mockCondominiumMCRepo.getByCondominiumAndMC = async () => null

      const result = await service.execute(createUpdateInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when currency does not exist', async function () {
      mockCurrenciesRepo.getById = async () => null

      const result = await service.execute(createUpdateInput())

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when name is empty', async function () {
      const result = await service.execute(createUpdateInput({ name: '' }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept missing recurrence period', async function () {
      const result = await service.execute(createUpdateInput({
        isRecurring: true,
        recurrencePeriod: null,
      }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept missing issueDay', async function () {
      const result = await service.execute(createUpdateInput({
        isRecurring: true,
        issueDay: null,
      }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when recurring concept missing dueDay', async function () {
      const result = await service.execute(createUpdateInput({
        isRecurring: true,
        dueDay: null,
      }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when issueDay out of range (0)', async function () {
      const result = await service.execute(createUpdateInput({ issueDay: 0 }))
      expect(result.success).toBe(false)
    })

    it('should fail when issueDay out of range (29)', async function () {
      const result = await service.execute(createUpdateInput({ issueDay: 29 }))
      expect(result.success).toBe(false)
    })

    it('should fail when dueDay out of range (0)', async function () {
      const result = await service.execute(createUpdateInput({ dueDay: 0 }))
      expect(result.success).toBe(false)
    })

    it('should fail when latePaymentType is percentage with value 0', async function () {
      const result = await service.execute(createUpdateInput({
        latePaymentType: 'percentage',
        latePaymentValue: 0,
      }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when latePaymentType is percentage with value over 100', async function () {
      const result = await service.execute(createUpdateInput({
        latePaymentType: 'percentage',
        latePaymentValue: 150,
      }))

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when earlyPaymentType is percentage with daysBeforeDue=0', async function () {
      const result = await service.execute(createUpdateInput({
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
      const result = await service.execute(createUpdateInput({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 150,
        earlyPaymentDaysBeforeDue: 10,
      }))

      expect(result.success).toBe(false)
    })

    it('should fail when no changes detected (same data)', async function () {
      // Input matches the existing concept exactly
      const input = createUpdateInput({
        name: 'Monthly Maintenance',
        description: 'Regular maintenance fee',
        conceptType: 'maintenance',
        isRecurring: true,
        recurrencePeriod: 'monthly',
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
        chargeGenerationStrategy: 'auto',
        isActive: true,
        metadata: null,
      })

      const result = await service.execute(input)

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
    it('should detect changes in assignments even when base fields unchanged', async function () {
      // Same base fields but different assignments
      const input = createUpdateInput({
        name: 'Monthly Maintenance', // same
        description: 'Regular maintenance fee', // same
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId,
            distributionMethod: 'by_aliquot',
            amount: 500,
          },
        ],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should detect changes in bank accounts even when base fields unchanged', async function () {
      const input = createUpdateInput({
        name: 'Monthly Maintenance',
        description: 'Regular maintenance fee',
        bankAccountIds: [bankAccountId2], // different from existing bankAccountId1
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should detect changes in services even when base fields unchanged', async function () {
      mockConceptServicesRepo.listByConceptId = async () => [
        { id: 'link1', serviceId: serviceId1, amount: 50, useDefaultAmount: true },
      ]

      const input = createUpdateInput({
        name: 'Monthly Maintenance',
        description: 'Regular maintenance fee',
        services: [
          { serviceId: serviceId1, amount: 100, useDefaultAmount: false }, // different amount
        ],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should keep existing bank accounts unchanged when same set is provided', async function () {
      let unlinkCalled = false
      let linkCalled = false

      mockBankAccountsRepo.unlinkBankAccount = async () => {
        unlinkCalled = true
        return true
      }
      mockBankAccountsRepo.linkBankAccount = async (_cId, baId, _by) => {
        linkCalled = true
        return mockBankAccount({ bankAccountId: baId })
      }

      // Provide the same bank account that already exists
      const input = createUpdateInput({
        name: 'Changed Name',
        bankAccountIds: [bankAccountId1],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
      expect(unlinkCalled).toBe(false)
      expect(linkCalled).toBe(false)
    })

    it('should handle update when concept has no existing assignments', async function () {
      mockAssignmentsRepo.listByConceptId = async () => []

      const input = createUpdateInput({
        name: 'Changed',
        assignments: [
          {
            scopeType: 'condominium',
            condominiumId,
            distributionMethod: 'equal_split',
            amount: 200,
          },
        ],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })

    it('should handle update when concept has no existing bank accounts', async function () {
      mockBankAccountsRepo.listByConceptId = async () => []

      const input = createUpdateInput({
        name: 'Changed',
        bankAccountIds: [bankAccountId1],
      })

      const result = await service.execute(input)
      expect(result.success).toBe(true)
    })
  })
})
