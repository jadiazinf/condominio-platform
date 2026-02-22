import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptAssignment,
  TPaymentConceptBankAccount,
} from '@packages/domain'
import { McPaymentConceptsController } from '@http/controllers/payment-concepts/mc-payment-concepts.controller'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  PaymentConceptBankAccountsRepository,
  CondominiumsRepository,
  CurrenciesRepository,
} from '@database/repositories'
import { createTestApp, type IApiResponse } from './test-utils'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MC_ID = '550e8400-e29b-41d4-a716-446655440010'
const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const CONCEPT_ID = '550e8400-e29b-41d4-a716-446655440020'
const CONDO_ID = '550e8400-e29b-41d4-a716-446655440030'
const CURRENCY_ID = '550e8400-e29b-41d4-a716-446655440040'
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440050'
const BANK_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440060'

// ─────────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────────

function createPaymentConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: CONCEPT_ID,
    condominiumId: CONDO_ID,
    buildingId: null,
    name: 'Monthly Maintenance',
    description: 'Regular maintenance fee',
    conceptType: 'maintenance',
    isRecurring: true,
    recurrencePeriod: 'monthly',
    currencyId: CURRENCY_ID,
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
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createAssignment(overrides: Partial<TPaymentConceptAssignment> = {}): TPaymentConceptAssignment {
  return {
    id: ASSIGNMENT_ID,
    paymentConceptId: CONCEPT_ID,
    scopeType: 'condominium',
    condominiumId: CONDO_ID,
    buildingId: null,
    unitId: null,
    distributionMethod: 'fixed_per_unit',
    amount: 100,
    isActive: true,
    assignedBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createBankAccountLink(overrides: Partial<TPaymentConceptBankAccount> = {}): TPaymentConceptBankAccount {
  return {
    id: '550e8400-e29b-41d4-a716-446655440070',
    paymentConceptId: CONCEPT_ID,
    bankAccountId: BANK_ACCOUNT_ID,
    assignedBy: USER_ID,
    createdAt: new Date(),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Types
// ─────────────────────────────────────────────────────────────────────────────

type TMockConceptsRepo = {
  listAll: () => Promise<TPaymentConcept[]>
  getById: (id: string) => Promise<TPaymentConcept | null>
  create: (data: TPaymentConceptCreate) => Promise<TPaymentConcept>
  update: (id: string, data: unknown) => Promise<TPaymentConcept | null>
  delete: (id: string) => Promise<boolean>
}

type TMockAssignmentsRepo = {
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptAssignment[]>
  getByConceptAndScope: (conceptId: string, scope: string, buildingId: string | null, unitId: string | null) => Promise<TPaymentConceptAssignment | null>
  create: (data: unknown) => Promise<TPaymentConceptAssignment>
  update: (id: string, data: unknown) => Promise<TPaymentConceptAssignment | null>
}

type TMockConceptBankAccountsRepo = {
  listByConceptId: (conceptId: string) => Promise<TPaymentConceptBankAccount[]>
  linkBankAccount: (conceptId: string, bankAccountId: string, assignedBy: string | null) => Promise<TPaymentConceptBankAccount>
  unlinkBankAccount: (conceptId: string, bankAccountId: string) => Promise<boolean>
  getLink: (conceptId: string, bankAccountId: string) => Promise<TPaymentConceptBankAccount | null>
}

type TMockCondominiumsRepo = {
  getById: (id: string) => Promise<{ id: string; name: string } | null>
}

type TMockCurrenciesRepo = {
  getById: (id: string) => Promise<{ id: string; code: string } | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('McPaymentConceptsController', function () {
  let app: Hono
  let mockConceptsRepo: TMockConceptsRepo
  let mockAssignmentsRepo: TMockAssignmentsRepo
  let mockConceptBankAccountsRepo: TMockConceptBankAccountsRepo
  let mockCondominiumsRepo: TMockCondominiumsRepo
  let mockCurrenciesRepo: TMockCurrenciesRepo
  let testConcepts: TPaymentConcept[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(function () {
    testConcepts = [
      createPaymentConcept(),
      createPaymentConcept({
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Parking Fee',
        conceptType: 'condominium_fee',
      }),
    ]

    mockConceptsRepo = {
      listAll: async () => testConcepts,
      getById: async (id) => testConcepts.find(c => c.id === id) ?? null,
      create: async (data) => createPaymentConcept({ ...data as Partial<TPaymentConcept>, id: crypto.randomUUID() }),
      update: async (id, data) => {
        const concept = testConcepts.find(c => c.id === id)
        if (!concept) return null
        return { ...concept, ...(data as Partial<TPaymentConcept>) }
      },
      delete: async () => true,
    }

    mockAssignmentsRepo = {
      listByConceptId: async () => [createAssignment()],
      getByConceptAndScope: async () => null,
      create: async (data) => createAssignment(data as Partial<TPaymentConceptAssignment>),
      update: async (id, data) => createAssignment({ id, ...(data as Partial<TPaymentConceptAssignment>) }),
    }

    mockConceptBankAccountsRepo = {
      listByConceptId: async () => [createBankAccountLink()],
      linkBankAccount: async (conceptId, bankAccountId, assignedBy) =>
        createBankAccountLink({ paymentConceptId: conceptId, bankAccountId, assignedBy }),
      unlinkBankAccount: async () => true,
      getLink: async () => null,
    }

    mockCondominiumsRepo = {
      getById: async (id) => {
        if (id === CONDO_ID) return { id: CONDO_ID, name: 'Test Condo' }
        return null
      },
    }

    mockCurrenciesRepo = {
      getById: async (id) => {
        if (id === CURRENCY_ID) return { id: CURRENCY_ID, code: 'VES' }
        return null
      },
    }

    const mockCondominiumMCRepo = {
      getByCondominiumAndMC: async (condoId: string, mcId: string) => {
        if (condoId === CONDO_ID && mcId === MC_ID) return { id: CONDO_ID }
        return null
      },
    }

    const mockBankAccountsRepo = {
      getById: async (id: string) => {
        if (id === BANK_ACCOUNT_ID) {
          return {
            id: BANK_ACCOUNT_ID,
            managementCompanyId: MC_ID,
            isActive: true,
            appliesToAllCondominiums: true,
          }
        }
        return null
      },
    }

    const mockBankAccountCondominiumsRepo = {
      getByBankAccountAndCondominium: async () => ({ id: BANK_ACCOUNT_ID }),
    }

    const mockBuildingsRepo = {
      getById: async () => null,
    }

    const mockUnitsRepo = {
      getById: async () => null,
      getByBuildingId: async () => [],
      getByCondominiumId: async () => [
        { id: 'unit-1', buildingId: 'bld-1', aliquotPercentage: '50.000000', isActive: true },
        { id: 'unit-2', buildingId: 'bld-1', aliquotPercentage: '50.000000', isActive: true },
      ],
    }

    const mockQuotasRepo = {
      existsForConceptAndPeriod: async () => false,
      createMany: async (records: Record<string, unknown>[]) =>
        records.map(() => ({ id: crypto.randomUUID() })),
    }

    const mockDb = {
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    }

    const controller = new McPaymentConceptsController({
      db: mockDb as never,
      conceptsRepo: mockConceptsRepo as unknown as PaymentConceptsRepository,
      assignmentsRepo: mockAssignmentsRepo as unknown as PaymentConceptAssignmentsRepository,
      conceptBankAccountsRepo: mockConceptBankAccountsRepo as unknown as PaymentConceptBankAccountsRepository,
      condominiumsRepo: mockCondominiumsRepo as unknown as CondominiumsRepository,
      currenciesRepo: mockCurrenciesRepo as unknown as CurrenciesRepository,
      condominiumMCRepo: mockCondominiumMCRepo,
      bankAccountsRepo: mockBankAccountsRepo,
      bankAccountCondominiumsRepo: mockBankAccountCondominiumsRepo,
      buildingsRepo: mockBuildingsRepo,
      unitsRepo: mockUnitsRepo,
      quotasRepo: mockQuotasRepo,
    })

    app = createTestApp()
    app.route('', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Route Definitions
  // ─────────────────────────────────────────────────────────────────────────

  describe('route definitions', function () {
    it('should define all expected routes', function () {
      const controller = new McPaymentConceptsController({
        db: {} as never,
        conceptsRepo: mockConceptsRepo as unknown as PaymentConceptsRepository,
        assignmentsRepo: mockAssignmentsRepo as unknown as PaymentConceptAssignmentsRepository,
        conceptBankAccountsRepo: mockConceptBankAccountsRepo as unknown as PaymentConceptBankAccountsRepository,
        condominiumsRepo: mockCondominiumsRepo as unknown as CondominiumsRepository,
        currenciesRepo: mockCurrenciesRepo as unknown as CurrenciesRepository,
        condominiumMCRepo: { getByCondominiumAndMC: async () => null },
        bankAccountsRepo: { getById: async () => null },
        bankAccountCondominiumsRepo: { getByBankAccountAndCondominium: async () => null },
        buildingsRepo: { getById: async () => null },
        unitsRepo: { getById: async () => null, getByBuildingId: async () => [], getByCondominiumId: async () => [] },
        quotasRepo: { existsForConceptAndPeriod: async () => false, createMany: async () => [] },
      })

      const routes = controller.routes
      expect(routes.length).toBe(14)

      // Currencies
      expect(routes[0]!.method).toBe('get')
      expect(routes[0]!.path).toContain('/me/currencies')
      expect(routes[0]!.middlewares!.length).toBeGreaterThanOrEqual(3)

      // Concept CRUD
      expect(routes[1]!.method).toBe('get')
      expect(routes[1]!.path).toContain('/me/payment-concepts')
      expect(routes[1]!.middlewares!.length).toBeGreaterThanOrEqual(3)

      expect(routes[2]!.method).toBe('get')
      expect(routes[2]!.path).toContain('/me/payment-concepts/:conceptId')

      expect(routes[3]!.method).toBe('post')
      expect(routes[3]!.path).toContain('/me/payment-concepts')
      expect(routes[3]!.middlewares!.length).toBeGreaterThanOrEqual(4) // auth + params + requireRole + bodyValidator

      expect(routes[4]!.method).toBe('patch')
      expect(routes[4]!.path).toContain('/me/payment-concepts/:conceptId')

      expect(routes[5]!.method).toBe('patch')
      expect(routes[5]!.path).toContain('/deactivate')

      // Assignments
      expect(routes[6]!.method).toBe('get')
      expect(routes[6]!.path).toContain('/assignments')

      expect(routes[7]!.method).toBe('post')
      expect(routes[7]!.path).toContain('/assignments')

      expect(routes[8]!.method).toBe('patch')
      expect(routes[8]!.path).toContain('/assignments/:assignmentId')

      expect(routes[9]!.method).toBe('patch')
      expect(routes[9]!.path).toContain('/assignments/:assignmentId/deactivate')

      // Bank accounts
      expect(routes[10]!.method).toBe('get')
      expect(routes[10]!.path).toContain('/bank-accounts')

      expect(routes[11]!.method).toBe('post')
      expect(routes[11]!.path).toContain('/bank-accounts')

      expect(routes[12]!.method).toBe('delete')
      expect(routes[12]!.path).toContain('/bank-accounts/:linkId')

      // Generate
      expect(routes[13]!.method).toBe('post')
      expect(routes[13]!.path).toContain('/generate')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Concept CRUD
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /:mcId/me/payment-concepts (list)', function () {
    it('should return all concepts', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })
  })

  describe('GET /:mcId/me/payment-concepts/:conceptId (detail)', function () {
    it('should return concept with assignments and bank accounts', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Monthly Maintenance')
      expect(json.data.assignments).toHaveLength(1)
      expect(json.data.bankAccounts).toHaveLength(1)
    })

    it('should return 404 for non-existent concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/550e8400-e29b-41d4-a716-446655440099`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('POST /:mcId/me/payment-concepts (create)', function () {
    it('should create a payment concept', async function () {
      const body = {
        name: 'New Fee',
        condominiumId: CONDO_ID,
        conceptType: 'condominium_fee',
        currencyId: CURRENCY_ID,
        isRecurring: true,
        recurrencePeriod: 'monthly',
        issueDay: 1,
        dueDay: 15,
      }

      const res = await request(`/${MC_ID}/me/payment-concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
      expect(json.data.name).toBe('New Fee')
    })

    it('should return 404 when condominium not found', async function () {
      const body = {
        name: 'New Fee',
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
        conceptType: 'condominium_fee',
        currencyId: CURRENCY_ID,
        isRecurring: false,
      }

      const res = await request(`/${MC_ID}/me/payment-concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('PATCH /:mcId/me/payment-concepts/:conceptId (update)', function () {
    it('should update a concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Updated Name')
    })

    it('should return 404 for non-existent concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/550e8400-e29b-41d4-a716-446655440099`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('PATCH /:mcId/me/payment-concepts/:conceptId/deactivate', function () {
    it('should deactivate a concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/deactivate`, {
        method: 'PATCH',
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isActive).toBe(false)
    })

    it('should return 404 for non-existent concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/550e8400-e29b-41d4-a716-446655440099/deactivate`, {
        method: 'PATCH',
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Assignments
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /:mcId/me/payment-concepts/:conceptId/assignments', function () {
    it('should return assignments for a concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/assignments`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].scopeType).toBe('condominium')
    })
  })

  describe('POST /:mcId/me/payment-concepts/:conceptId/assignments', function () {
    it('should create an assignment', async function () {
      const body = {
        scopeType: 'condominium',
        condominiumId: CONDO_ID,
        distributionMethod: 'fixed_per_unit',
        amount: 200,
      }

      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
    })

    it('should return 409 for duplicate assignment', async function () {
      mockAssignmentsRepo.getByConceptAndScope = async () => createAssignment()

      const body = {
        scopeType: 'condominium',
        condominiumId: CONDO_ID,
        distributionMethod: 'fixed_per_unit',
        amount: 200,
      }

      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      expect(res.status).toBe(StatusCodes.CONFLICT)
    })
  })

  describe('PATCH /:mcId/me/payment-concepts/:conceptId/assignments/:assignmentId/deactivate', function () {
    it('should deactivate an assignment', async function () {
      const res = await request(
        `/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/assignments/${ASSIGNMENT_ID}/deactivate`,
        { method: 'PATCH' }
      )
      expect(res.status).toBe(StatusCodes.OK)
    })

    it('should return 404 for non-existent assignment', async function () {
      mockAssignmentsRepo.update = async () => null

      const res = await request(
        `/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/assignments/550e8400-e29b-41d4-a716-446655440099/deactivate`,
        { method: 'PATCH' }
      )
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Bank Accounts
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /:mcId/me/payment-concepts/:conceptId/bank-accounts', function () {
    it('should return linked bank accounts', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/bank-accounts`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
    })
  })

  describe('POST /:mcId/me/payment-concepts/:conceptId/bank-accounts', function () {
    it('should link a bank account', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: BANK_ACCOUNT_ID }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)
    })

    it('should return 409 for duplicate link', async function () {
      mockConceptBankAccountsRepo.getLink = async () => createBankAccountLink()

      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: BANK_ACCOUNT_ID }),
      })
      expect(res.status).toBe(StatusCodes.CONFLICT)
    })
  })

  describe('DELETE /:mcId/me/payment-concepts/:conceptId/bank-accounts/:linkId', function () {
    it('should unlink a bank account', async function () {
      mockConceptBankAccountsRepo.getLink = async () => createBankAccountLink()

      const res = await request(
        `/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/bank-accounts/${BANK_ACCOUNT_ID}`,
        { method: 'DELETE' }
      )
      expect(res.status).toBe(StatusCodes.OK)
    })

    it('should return 404 for non-existent link', async function () {
      const res = await request(
        `/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/bank-accounts/550e8400-e29b-41d4-a716-446655440099`,
        { method: 'DELETE' }
      )
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Charges
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /:mcId/me/payment-concepts/:conceptId/generate', function () {
    it('should generate charges for a period', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodYear: 2026, periodMonth: 3 }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.quotasCreated).toBe(2)
    })

    it('should return 409 when charges already exist for period', async function () {
      // Override quotas repo to indicate existing charges
      const controller2 = new McPaymentConceptsController({
        db: { transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as never,
        conceptsRepo: mockConceptsRepo as unknown as PaymentConceptsRepository,
        assignmentsRepo: mockAssignmentsRepo as unknown as PaymentConceptAssignmentsRepository,
        conceptBankAccountsRepo: mockConceptBankAccountsRepo as unknown as PaymentConceptBankAccountsRepository,
        condominiumsRepo: mockCondominiumsRepo as unknown as CondominiumsRepository,
        currenciesRepo: mockCurrenciesRepo as unknown as CurrenciesRepository,
        condominiumMCRepo: { getByCondominiumAndMC: async () => ({ id: CONDO_ID }) },
        bankAccountsRepo: { getById: async () => null },
        bankAccountCondominiumsRepo: { getByBankAccountAndCondominium: async () => null },
        buildingsRepo: { getById: async () => null },
        unitsRepo: { getById: async () => null, getByBuildingId: async () => [], getByCondominiumId: async () => [] },
        quotasRepo: { existsForConceptAndPeriod: async () => true, createMany: async () => [] },
      })

      const app2 = createTestApp()
      app2.route('', controller2.createRouter())

      const res = await app2.request(`/${MC_ID}/me/payment-concepts/${CONCEPT_ID}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodYear: 2026, periodMonth: 3 }),
      })
      expect(res.status).toBe(StatusCodes.CONFLICT)
    })

    it('should return 404 for non-existent concept', async function () {
      const res = await request(`/${MC_ID}/me/payment-concepts/550e8400-e29b-41d4-a716-446655440099/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodYear: 2026, periodMonth: 3 }),
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })
})
