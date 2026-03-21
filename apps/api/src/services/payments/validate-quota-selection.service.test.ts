import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { ValidateQuotaSelectionService } from './validate-quota-selection.service'

function createMockQuota(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: 1,
    periodDescription: 'Enero 2026',
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    status: 'pending' as const,
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '1000.00',
    notes: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockConcept(overrides: Record<string, unknown> = {}) {
  return {
    id: 'concept-1',
    condominiumId: 'condo-1',
    buildingId: null,
    name: 'Condominio',
    description: null,
    conceptType: 'condominium_fee' as const,
    isRecurring: true,
    recurrencePeriod: 'monthly' as const,
    chargeGenerationStrategy: 'auto' as const,
    currencyId: 'currency-1',
    allowsPartialPayment: true,
    latePaymentType: 'none' as const,
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none' as const,
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    effectiveFrom: null,
    effectiveUntil: null,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockBankAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ba-1',
    managementCompanyId: 'mc-1',
    bankId: 'bank-1',
    accountCategory: 'national' as const,
    displayName: 'BNC Principal',
    bankName: 'Banco Nacional de Crédito',
    accountHolderName: 'Administradora Latorre',
    currency: 'VES',
    currencyId: 'currency-1',
    accountDetails: {
      accountNumber: '01910000000000001234',
      bankCode: '0191',
      accountType: 'corriente' as const,
      identityDocType: 'J' as const,
      identityDocNumber: '12345678',
    },
    acceptedPaymentMethods: ['transfer', 'pago_movil'],
    appliesToAllCondominiums: false,
    isActive: true,
    notes: null,
    createdBy: 'user-1',
    deactivatedBy: null,
    deactivatedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('ValidateQuotaSelectionService', () => {
  let service: ValidateQuotaSelectionService
  let quotasRepo: {
    getById: ReturnType<typeof mock>
    getUnpaidByConceptAndUnit: ReturnType<typeof mock>
  }
  let conceptsRepo: {
    getById: ReturnType<typeof mock>
  }
  let conceptBankAccountsRepo: {
    listByConceptId: ReturnType<typeof mock>
  }
  let bankAccountsRepo: {
    getById: ReturnType<typeof mock>
  }

  beforeEach(() => {
    quotasRepo = {
      getById: mock(() => Promise.resolve(null)),
      getUnpaidByConceptAndUnit: mock(() => Promise.resolve([])),
    }
    conceptsRepo = {
      getById: mock(() => Promise.resolve(null)),
    }
    conceptBankAccountsRepo = {
      listByConceptId: mock(() => Promise.resolve([])),
    }
    bankAccountsRepo = {
      getById: mock(() => Promise.resolve(null)),
    }

    service = new ValidateQuotaSelectionService(
      quotasRepo as never,
      conceptsRepo as never,
      conceptBankAccountsRepo as never,
      bankAccountsRepo as never,
    )
  })

  describe('valid selection', () => {
    it('should validate a simple single-quota selection', async () => {
      const quota = createMockQuota()
      const concept = createMockConcept()
      const bankAccount = createMockBankAccount()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(bankAccount)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe('1000.00')
        expect(result.data.currencyId).toBe('currency-1')
        expect(result.data.validatedQuotas).toHaveLength(1)
        expect(result.data.commonBankAccounts).toHaveLength(1)
      }
    })

    it('should allow partial payment when concept permits it', async () => {
      const quota = createMockQuota({ balance: '1000.00' })
      const concept = createMockConcept({ allowsPartialPayment: true })

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(createMockBankAccount())

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '500.00' }, // Partial
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe('500.00')
      }
    })
  })

  describe('quota ownership', () => {
    it('should reject quotas that do not belong to the unit', async () => {
      const quota = createMockQuota({ unitId: 'other-unit' })
      quotasRepo.getById.mockResolvedValue(quota)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject when quota does not exist', async () => {
      quotasRepo.getById.mockResolvedValue(null)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['nonexistent'],
        amounts: { nonexistent: '100' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('quota status', () => {
    it('should reject already paid quotas', async () => {
      const quota = createMockQuota({ status: 'paid' })
      quotasRepo.getById.mockResolvedValue(quota)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject cancelled quotas', async () => {
      const quota = createMockQuota({ status: 'cancelled' })
      quotasRepo.getById.mockResolvedValue(quota)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(false)
    })

    it('should reject exonerated quotas', async () => {
      const quota = createMockQuota({ status: 'exonerated' })
      quotasRepo.getById.mockResolvedValue(quota)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(false)
    })

    it('should accept overdue quotas', async () => {
      const quota = createMockQuota({ status: 'overdue' })
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(createMockBankAccount())

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(true)
    })

    it('should accept partial quotas', async () => {
      const quota = createMockQuota({ status: 'partial', paidAmount: '500.00', balance: '500.00' })
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(createMockBankAccount())

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '500.00' },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('oldest-first rule', () => {
    it('should reject when skipping an older unpaid quota of the same concept', async () => {
      const oldQuota = createMockQuota({ id: 'q-old', dueDate: '2025-12-15', periodMonth: 12, periodYear: 2025 })
      const newQuota = createMockQuota({ id: 'q-new', dueDate: '2026-01-15', periodMonth: 1, periodYear: 2026 })
      const concept = createMockConcept()

      quotasRepo.getById.mockImplementation((id: string) => {
        if (id === 'q-new') return Promise.resolve(newQuota)
        return Promise.resolve(null)
      })
      conceptsRepo.getById.mockResolvedValue(concept)
      // All unpaid quotas for this concept+unit ordered by dueDate
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([oldQuota, newQuota])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-new'], // Skipping q-old
        amounts: { 'q-new': '1000.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('antigua')
      }
    })

    it('should accept when selecting the oldest quota first', async () => {
      const oldQuota = createMockQuota({ id: 'q-old', dueDate: '2025-12-15' })
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(oldQuota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([oldQuota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(createMockBankAccount())

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-old'],
        amounts: { 'q-old': '1000.00' },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('partial payment rules', () => {
    it('should reject partial payment when concept disallows it', async () => {
      const quota = createMockQuota({ balance: '1000.00' })
      const concept = createMockConcept({ allowsPartialPayment: false })

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '500.00' }, // Partial — should fail
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('completo')
      }
    })

    it('should accept full payment when concept disallows partial', async () => {
      const quota = createMockQuota({ balance: '1000.00' })
      const concept = createMockConcept({ allowsPartialPayment: false })

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
        { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
      ])
      bankAccountsRepo.getById.mockResolvedValue(createMockBankAccount())

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('amount validation', () => {
    it('should reject amount greater than balance', async () => {
      const quota = createMockQuota({ balance: '1000.00' })
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1500.00' }, // Over balance
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject zero amount', async () => {
      const quota = createMockQuota()
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '0' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject negative amount', async () => {
      const quota = createMockQuota()
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '-100' },
      })

      expect(result.success).toBe(false)
    })
  })

  describe('currency consistency', () => {
    it('should reject mixed currencies', async () => {
      const quota1 = createMockQuota({ id: 'q-1', paymentConceptId: 'concept-1', currencyId: 'currency-ves' })
      const quota2 = createMockQuota({ id: 'q-2', paymentConceptId: 'concept-2', currencyId: 'currency-usd' })
      const concept1 = createMockConcept({ id: 'concept-1', currencyId: 'currency-ves' })
      const concept2 = createMockConcept({ id: 'concept-2', currencyId: 'currency-usd' })

      quotasRepo.getById.mockImplementation((id: string) => {
        if (id === 'q-1') return Promise.resolve(quota1)
        if (id === 'q-2') return Promise.resolve(quota2)
        return Promise.resolve(null)
      })
      conceptsRepo.getById.mockImplementation((id: string) => {
        if (id === 'concept-1') return Promise.resolve(concept1)
        if (id === 'concept-2') return Promise.resolve(concept2)
        return Promise.resolve(null)
      })
      quotasRepo.getUnpaidByConceptAndUnit
        .mockResolvedValueOnce([quota1])
        .mockResolvedValueOnce([quota2])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1', 'q-2'],
        amounts: { 'q-1': '1000.00', 'q-2': '500.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('moneda')
      }
    })
  })

  describe('common bank accounts', () => {
    it('should return intersection of bank accounts across concepts', async () => {
      const quota1 = createMockQuota({ id: 'q-1', paymentConceptId: 'concept-1' })
      const quota2 = createMockQuota({ id: 'q-2', paymentConceptId: 'concept-2' })
      const concept1 = createMockConcept({ id: 'concept-1' })
      const concept2 = createMockConcept({ id: 'concept-2' })
      const sharedAccount = createMockBankAccount({ id: 'ba-shared' })
      const exclusiveAccount = createMockBankAccount({ id: 'ba-exclusive' })

      quotasRepo.getById.mockImplementation((id: string) => {
        if (id === 'q-1') return Promise.resolve(quota1)
        if (id === 'q-2') return Promise.resolve(quota2)
        return Promise.resolve(null)
      })
      conceptsRepo.getById.mockImplementation((id: string) => {
        if (id === 'concept-1') return Promise.resolve(concept1)
        if (id === 'concept-2') return Promise.resolve(concept2)
        return Promise.resolve(null)
      })
      quotasRepo.getUnpaidByConceptAndUnit
        .mockResolvedValueOnce([quota1])
        .mockResolvedValueOnce([quota2])

      // concept-1 has both accounts, concept-2 only has shared
      conceptBankAccountsRepo.listByConceptId.mockImplementation((conceptId: string) => {
        if (conceptId === 'concept-1') return Promise.resolve([
          { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-shared', assignedBy: null, createdAt: new Date() },
          { id: 'link-2', paymentConceptId: 'concept-1', bankAccountId: 'ba-exclusive', assignedBy: null, createdAt: new Date() },
        ])
        if (conceptId === 'concept-2') return Promise.resolve([
          { id: 'link-3', paymentConceptId: 'concept-2', bankAccountId: 'ba-shared', assignedBy: null, createdAt: new Date() },
        ])
        return Promise.resolve([])
      })
      bankAccountsRepo.getById.mockImplementation((id: string) => {
        if (id === 'ba-shared') return Promise.resolve(sharedAccount)
        if (id === 'ba-exclusive') return Promise.resolve(exclusiveAccount)
        return Promise.resolve(null)
      })

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1', 'q-2'],
        amounts: { 'q-1': '1000.00', 'q-2': '1000.00' },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Only the shared account should appear
        expect(result.data.commonBankAccounts).toHaveLength(1)
        expect(result.data.commonBankAccounts[0].id).toBe('ba-shared')
      }
    })

    it('should reject when no common bank accounts exist', async () => {
      const quota1 = createMockQuota({ id: 'q-1', paymentConceptId: 'concept-1' })
      const quota2 = createMockQuota({ id: 'q-2', paymentConceptId: 'concept-2' })
      const concept1 = createMockConcept({ id: 'concept-1' })
      const concept2 = createMockConcept({ id: 'concept-2' })

      quotasRepo.getById.mockImplementation((id: string) => {
        if (id === 'q-1') return Promise.resolve(quota1)
        if (id === 'q-2') return Promise.resolve(quota2)
        return Promise.resolve(null)
      })
      conceptsRepo.getById.mockImplementation((id: string) => {
        if (id === 'concept-1') return Promise.resolve(concept1)
        if (id === 'concept-2') return Promise.resolve(concept2)
        return Promise.resolve(null)
      })
      quotasRepo.getUnpaidByConceptAndUnit
        .mockResolvedValueOnce([quota1])
        .mockResolvedValueOnce([quota2])

      // Each concept has a different exclusive bank account
      conceptBankAccountsRepo.listByConceptId.mockImplementation((conceptId: string) => {
        if (conceptId === 'concept-1') return Promise.resolve([
          { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
        ])
        if (conceptId === 'concept-2') return Promise.resolve([
          { id: 'link-2', paymentConceptId: 'concept-2', bankAccountId: 'ba-2', assignedBy: null, createdAt: new Date() },
        ])
        return Promise.resolve([])
      })
      bankAccountsRepo.getById.mockImplementation((id: string) => {
        if (id === 'ba-1') return Promise.resolve(createMockBankAccount({ id: 'ba-1' }))
        if (id === 'ba-2') return Promise.resolve(createMockBankAccount({ id: 'ba-2' }))
        return Promise.resolve(null)
      })

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1', 'q-2'],
        amounts: { 'q-1': '1000.00', 'q-2': '1000.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('cuenta bancaria')
      }
    })

    it('should reject when concept has no bank accounts', async () => {
      const quota = createMockQuota()
      const concept = createMockConcept()

      quotasRepo.getById.mockResolvedValue(quota)
      conceptsRepo.getById.mockResolvedValue(concept)
      quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
      conceptBankAccountsRepo.listByConceptId.mockResolvedValue([])

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: { 'q-1': '1000.00' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('cuenta bancaria')
      }
    })
  })

  describe('missing amount', () => {
    it('should reject when amount is missing for a quota', async () => {
      const quota = createMockQuota()
      quotasRepo.getById.mockResolvedValue(quota)

      const result = await service.execute({
        unitId: 'unit-1',
        quotaIds: ['q-1'],
        amounts: {}, // No amount for q-1
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })
})
