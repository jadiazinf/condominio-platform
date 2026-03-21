import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { GetPayableQuotasService } from './get-payable-quotas.service'
import type { QuotasRepository, PaymentConceptBankAccountsRepository, BankAccountsRepository, PaymentConceptsRepository } from '@database/repositories'

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
      phoneNumber: '584121234567',
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

describe('GetPayableQuotasService', () => {
  let service: GetPayableQuotasService
  let quotasRepo: {
    getUnpaidByConceptAndUnit: ReturnType<typeof mock>
  }
  let conceptBankAccountsRepo: {
    listByConceptId: ReturnType<typeof mock>
  }
  let bankAccountsRepo: {
    getById: ReturnType<typeof mock>
  }
  let conceptsRepo: {
    getById: ReturnType<typeof mock>
  }

  beforeEach(() => {
    quotasRepo = {
      getUnpaidByConceptAndUnit: mock(() => Promise.resolve([])),
    }
    conceptBankAccountsRepo = {
      listByConceptId: mock(() => Promise.resolve([])),
    }
    bankAccountsRepo = {
      getById: mock(() => Promise.resolve(null)),
    }
    conceptsRepo = {
      getById: mock(() => Promise.resolve(null)),
    }

    service = new GetPayableQuotasService(
      quotasRepo as never,
      conceptBankAccountsRepo as never,
      bankAccountsRepo as never,
      conceptsRepo as never,
    )
  })

  it('should return empty groups when no unpaid quotas exist', async () => {
    conceptsRepo.getById.mockResolvedValue(createMockConcept())
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([])

    const result = await service.execute({
      unitId: 'unit-1',
      conceptIds: ['concept-1'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups).toEqual([])
    }
  })

  it('should return quotas grouped by concept with bank accounts', async () => {
    const concept = createMockConcept()
    const quota1 = createMockQuota({ id: 'q-1', periodMonth: 1, dueDate: '2026-01-15' })
    const quota2 = createMockQuota({ id: 'q-2', periodMonth: 2, dueDate: '2026-02-15' })
    const bankAccount = createMockBankAccount()
    const conceptBankLink = { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() }

    conceptsRepo.getById.mockResolvedValue(concept)
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota1, quota2])
    conceptBankAccountsRepo.listByConceptId.mockResolvedValue([conceptBankLink])
    bankAccountsRepo.getById.mockResolvedValue(bankAccount)

    const result = await service.execute({
      unitId: 'unit-1',
      conceptIds: ['concept-1'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups).toHaveLength(1)
      const group = result.data.groups[0]
      expect(group.concept.id).toBe('concept-1')
      expect(group.concept.name).toBe('Condominio')
      expect(group.concept.allowsPartialPayment).toBe(true)
      expect(group.quotas).toHaveLength(2)
      expect(group.bankAccounts).toHaveLength(1)
      expect(group.bankAccounts[0].id).toBe('ba-1')
      expect(group.bankAccounts[0].isBnc).toBe(true) // bankCode 0191
    }
  })

  it('should flag BNC bank accounts correctly', async () => {
    const concept = createMockConcept()
    const quota = createMockQuota()
    const bncAccount = createMockBankAccount({ id: 'ba-bnc', accountDetails: { accountNumber: '01910000000000001234', bankCode: '0191', accountType: 'corriente', identityDocType: 'J', identityDocNumber: '12345678' } })
    const otherAccount = createMockBankAccount({ id: 'ba-other', bankName: 'Banesco', accountDetails: { accountNumber: '01340000000000005678', bankCode: '0134', accountType: 'corriente', identityDocType: 'J', identityDocNumber: '12345678' } })

    conceptsRepo.getById.mockResolvedValue(concept)
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
    conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
      { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-bnc', assignedBy: null, createdAt: new Date() },
      { id: 'link-2', paymentConceptId: 'concept-1', bankAccountId: 'ba-other', assignedBy: null, createdAt: new Date() },
    ])
    bankAccountsRepo.getById
      .mockResolvedValueOnce(bncAccount)
      .mockResolvedValueOnce(otherAccount)

    const result = await service.execute({ unitId: 'unit-1', conceptIds: ['concept-1'] })

    expect(result.success).toBe(true)
    if (result.success) {
      const bankAccounts = result.data.groups[0].bankAccounts
      expect(bankAccounts).toHaveLength(2)
      expect(bankAccounts.find(ba => ba.id === 'ba-bnc')!.isBnc).toBe(true)
      expect(bankAccounts.find(ba => ba.id === 'ba-other')!.isBnc).toBe(false)
    }
  })

  it('should skip inactive bank accounts', async () => {
    const concept = createMockConcept()
    const quota = createMockQuota()
    const inactiveAccount = createMockBankAccount({ isActive: false })

    conceptsRepo.getById.mockResolvedValue(concept)
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
    conceptBankAccountsRepo.listByConceptId.mockResolvedValue([
      { id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() },
    ])
    bankAccountsRepo.getById.mockResolvedValue(inactiveAccount)

    const result = await service.execute({ unitId: 'unit-1', conceptIds: ['concept-1'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups[0].bankAccounts).toHaveLength(0)
    }
  })

  it('should handle multiple concepts', async () => {
    const concept1 = createMockConcept({ id: 'concept-1', name: 'Condominio', currencyId: 'c1' })
    const concept2 = createMockConcept({ id: 'concept-2', name: 'Fondo de Reserva', currencyId: 'c1', conceptType: 'reserve_fund' })

    const quota1 = createMockQuota({ paymentConceptId: 'concept-1' })
    const quota2 = createMockQuota({ id: 'q-2', paymentConceptId: 'concept-2' })

    const bankAccount = createMockBankAccount()

    conceptsRepo.getById
      .mockResolvedValueOnce(concept1)
      .mockResolvedValueOnce(concept2)
    quotasRepo.getUnpaidByConceptAndUnit
      .mockResolvedValueOnce([quota1])
      .mockResolvedValueOnce([quota2])
    conceptBankAccountsRepo.listByConceptId
      .mockResolvedValue([{ id: 'link-1', paymentConceptId: 'concept-1', bankAccountId: 'ba-1', assignedBy: null, createdAt: new Date() }])
    bankAccountsRepo.getById.mockResolvedValue(bankAccount)

    const result = await service.execute({
      unitId: 'unit-1',
      conceptIds: ['concept-1', 'concept-2'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups).toHaveLength(2)
    }
  })

  it('should skip concepts that do not exist', async () => {
    conceptsRepo.getById.mockResolvedValue(null)

    const result = await service.execute({
      unitId: 'unit-1',
      conceptIds: ['nonexistent'],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups).toEqual([])
    }
  })

  it('should include concept currency info in the response', async () => {
    const concept = createMockConcept({ currencyId: 'currency-ves' })
    const quota = createMockQuota({ currencyId: 'currency-ves' })

    conceptsRepo.getById.mockResolvedValue(concept)
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quota])
    conceptBankAccountsRepo.listByConceptId.mockResolvedValue([])

    const result = await service.execute({ unitId: 'unit-1', conceptIds: ['concept-1'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups[0].concept.currencyId).toBe('currency-ves')
    }
  })

  it('should return quotas ordered by dueDate (oldest first)', async () => {
    const concept = createMockConcept()
    // getUnpaidByConceptAndUnit already returns ordered by dueDate ASC
    const quotaOld = createMockQuota({ id: 'q-old', dueDate: '2025-12-15', periodMonth: 12, periodYear: 2025 })
    const quotaNew = createMockQuota({ id: 'q-new', dueDate: '2026-01-15', periodMonth: 1, periodYear: 2026 })

    conceptsRepo.getById.mockResolvedValue(concept)
    quotasRepo.getUnpaidByConceptAndUnit.mockResolvedValue([quotaOld, quotaNew])
    conceptBankAccountsRepo.listByConceptId.mockResolvedValue([])

    const result = await service.execute({ unitId: 'unit-1', conceptIds: ['concept-1'] })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups[0].quotas[0].id).toBe('q-old')
      expect(result.data.groups[0].quotas[1].id).toBe('q-new')
    }
  })
})
