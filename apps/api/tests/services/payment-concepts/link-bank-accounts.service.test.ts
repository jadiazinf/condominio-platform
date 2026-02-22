import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept, TPaymentConceptBankAccount } from '@packages/domain'
import { LinkBankAccountsService } from '@src/services/payment-concepts/link-bank-accounts.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockPaymentConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
}

type TMockBankAccountsRepo = {
  getById: (id: string) => Promise<{
    id: string
    managementCompanyId: string
    isActive: boolean
    appliesToAllCondominiums: boolean
  } | null>
}

type TMockBankAccountCondominiumsRepo = {
  getByBankAccountAndCondominium: (bankAccountId: string, condominiumId: string) => Promise<{ id: string } | null>
}

type TMockConceptBankAccountsRepo = {
  linkBankAccount: (conceptId: string, bankAccountId: string, assignedBy: string | null) => Promise<TPaymentConceptBankAccount>
  unlinkBankAccount: (conceptId: string, bankAccountId: string) => Promise<boolean>
  getLink: (conceptId: string, bankAccountId: string) => Promise<TPaymentConceptBankAccount | null>
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptBankAccount[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const conceptId = '550e8400-e29b-41d4-a716-446655440010'
const bankAccountId = '550e8400-e29b-41d4-a716-446655440020'
const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
const mcId = '550e8400-e29b-41d4-a716-446655440003'
const userId = '550e8400-e29b-41d4-a716-446655440004'

function mockConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: conceptId,
    condominiumId,
    buildingId: null,
    name: 'Test Concept',
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
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockLink(overrides: Partial<TPaymentConceptBankAccount> = {}): TPaymentConceptBankAccount {
  return {
    id: '550e8400-e29b-41d4-a716-446655440050',
    paymentConceptId: conceptId,
    bankAccountId,
    assignedBy: userId,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('LinkBankAccountsService', function () {
  let service: LinkBankAccountsService
  let mockConceptsRepo: TMockPaymentConceptsRepo
  let mockBankAccountsRepo: TMockBankAccountsRepo
  let mockBankAccountCondominiumsRepo: TMockBankAccountCondominiumsRepo
  let mockConceptBankAccountsRepo: TMockConceptBankAccountsRepo

  beforeEach(function () {
    mockConceptsRepo = {
      getById: async () => mockConcept(),
    }

    mockBankAccountsRepo = {
      getById: async () => ({
        id: bankAccountId,
        managementCompanyId: mcId,
        isActive: true,
        appliesToAllCondominiums: false,
      }),
    }

    mockBankAccountCondominiumsRepo = {
      getByBankAccountAndCondominium: async () => ({ id: '550e8400-e29b-41d4-a716-446655440060' }),
    }

    mockConceptBankAccountsRepo = {
      linkBankAccount: async (cId, baId, by) => mockLink({ paymentConceptId: cId, bankAccountId: baId, assignedBy: by }),
      unlinkBankAccount: async () => true,
      getLink: async () => null,
      listByConceptId: async () => [mockLink()],
    }

    service = new LinkBankAccountsService(
      mockConceptsRepo as never,
      mockBankAccountsRepo as never,
      mockBankAccountCondominiumsRepo as never,
      mockConceptBankAccountsRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Link Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('link', function () {
    it('should link active bank account to concept', async function () {
      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.paymentConceptId).toBe(conceptId)
        expect(result.data.bankAccountId).toBe(bankAccountId)
      }
    })

    it('should link bank account with appliesToAllCondominiums=true', async function () {
      mockBankAccountsRepo.getById = async () => ({
        id: bankAccountId,
        managementCompanyId: mcId,
        isActive: true,
        appliesToAllCondominiums: true,
      })

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(true)
    })

    it('should fail when bank account does not exist', async function () {
      mockBankAccountsRepo.getById = async () => null

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when bank account is not active', async function () {
      mockBankAccountsRepo.getById = async () => ({
        id: bankAccountId,
        managementCompanyId: mcId,
        isActive: false,
        appliesToAllCondominiums: false,
      })

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when bank account is from different MC', async function () {
      mockBankAccountsRepo.getById = async () => ({
        id: bankAccountId,
        managementCompanyId: '550e8400-e29b-41d4-a716-446655440099',
        isActive: true,
        appliesToAllCondominiums: false,
      })

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when bank account is not associated with concepts condominium', async function () {
      mockBankAccountCondominiumsRepo.getByBankAccountAndCondominium = async () => null

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when duplicate link exists', async function () {
      mockConceptBankAccountsRepo.getLink = async () => mockLink()

      const result = await service.link({
        paymentConceptId: conceptId,
        bankAccountId,
        managementCompanyId: mcId,
        assignedBy: userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Unlink + List Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('unlink', function () {
    it('should unlink bank account from concept', async function () {
      mockConceptBankAccountsRepo.getLink = async () => mockLink()

      const result = await service.unlink({
        paymentConceptId: conceptId,
        bankAccountId,
      })

      expect(result.success).toBe(true)
    })

    it('should fail when link does not exist', async function () {
      mockConceptBankAccountsRepo.getLink = async () => null

      const result = await service.unlink({
        paymentConceptId: conceptId,
        bankAccountId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('list', function () {
    it('should list linked bank accounts for concept', async function () {
      const result = await service.listByConceptId(conceptId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]!.paymentConceptId).toBe(conceptId)
      }
    })
  })
})
