import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TBankAccount, TBankAccountCreate } from '@packages/domain'
import { BankAccountsController } from '@http/controllers/bank-accounts/bank-accounts.controller'
import type { BankAccountsRepository, BanksRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  type IApiResponse,
} from './test-utils'

const MC_ID = '550e8400-e29b-41d4-a716-446655440010'
const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

function createTestBankAccount(overrides: Partial<TBankAccount> = {}): TBankAccount {
  return {
    id: crypto.randomUUID(),
    managementCompanyId: MC_ID,
    bankId: null,
    accountCategory: 'national',
    displayName: 'Banesco - Corriente (VES)',
    bankName: 'Banesco',
    accountHolderName: 'Empresa Test C.A.',
    currency: 'VES',
    accountDetails: {
      accountNumber: '01340100011234567890',
      bankCode: '0134',
      accountType: 'corriente',
      identityDocType: 'J',
      identityDocNumber: '12345678',
    },
    acceptedPaymentMethods: ['transfer', 'pago_movil'],
    appliesToAllCondominiums: true,
    isActive: true,
    notes: null,
    createdBy: USER_ID,
    deactivatedBy: null,
    deactivatedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Mock repository type
type TMockBankAccountsRepository = {
  listByManagementCompanyPaginated: (
    mcId: string,
    query: Record<string, unknown>
  ) => Promise<{ data: TBankAccount[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>
  getByIdWithCondominiums: (id: string) => Promise<(TBankAccount & { condominiumIds?: string[] }) | null>
  create: (data: TBankAccountCreate) => Promise<TBankAccount>
  deactivate: (id: string, deactivatedBy: string) => Promise<TBankAccount | null>
  getById: (id: string, includeInactive?: boolean) => Promise<TBankAccount | null>
  assignCondominiums: (bankAccountId: string, condominiumIds: string[], assignedBy: string) => Promise<void>
  withTx: (tx: unknown) => TMockBankAccountsRepository
}

// Mock banks repository
const mockBanksRepository = {
  getById: async function () {
    return null
  },
}

// Mock db for transaction support
const mockDb = {
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn({})
  },
}

describe('BankAccountsController', function () {
  let app: Hono
  let mockRepository: TMockBankAccountsRepository
  let testAccounts: TBankAccount[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(function () {
    const account1 = createTestBankAccount({
      id: '550e8400-e29b-41d4-a716-446655440001',
      displayName: 'Banesco - Corriente (VES)',
      bankName: 'Banesco',
    })
    const account2 = createTestBankAccount({
      id: '550e8400-e29b-41d4-a716-446655440002',
      accountCategory: 'international',
      displayName: 'Zelle - USD',
      bankName: 'Bank of America',
      currency: 'USD',
      accountDetails: {
        zelleEmail: 'admin@company.com',
      },
      acceptedPaymentMethods: ['zelle'],
      appliesToAllCondominiums: false,
    })

    testAccounts = [account1, account2]

    mockRepository = {
      listByManagementCompanyPaginated: async function (mcId, query) {
        const filtered = testAccounts.filter(a => a.managementCompanyId === mcId)
        return {
          data: filtered,
          pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
        }
      },
      getByIdWithCondominiums: async function (id) {
        const account = testAccounts.find(a => a.id === id)
        if (!account) return null
        return { ...account, condominiumIds: [] }
      },
      create: async function (data) {
        return withId(data, crypto.randomUUID()) as TBankAccount
      },
      deactivate: async function (id, deactivatedBy) {
        const account = testAccounts.find(a => a.id === id)
        if (!account) return null
        return { ...account, isActive: false, deactivatedBy, deactivatedAt: new Date() }
      },
      getById: async function (id, _includeInactive) {
        return testAccounts.find(a => a.id === id) ?? null
      },
      assignCondominiums: async function () {
        // no-op
      },
      withTx: function () {
        return mockRepository
      },
    }

    const controller = new BankAccountsController(
      mockRepository as unknown as BankAccountsRepository,
      mockBanksRepository as unknown as BanksRepository,
      mockDb as any
    )

    app = createTestApp()
    app.route('', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET /:managementCompanyId/me/bank-accounts (list)', function () {
    it('should return paginated bank accounts for the management company', async function () {
      const res = await request(`/${MC_ID}/me/bank-accounts`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array for unknown management company', async function () {
      const res = await request('/550e8400-e29b-41d4-a716-446655440099/me/bank-accounts')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should accept query parameters', async function () {
      const res = await request(`/${MC_ID}/me/bank-accounts?accountCategory=national&isActive=true&page=1&limit=10`)
      expect(res.status).toBe(StatusCodes.OK)
    })
  })

  describe('GET /:managementCompanyId/me/bank-accounts/:bankAccountId (detail)', function () {
    it('should return a bank account detail with condominiums', async function () {
      const res = await request(`/${MC_ID}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440001`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.displayName).toBe('Banesco - Corriente (VES)')
      expect(json.data.bankName).toBe('Banesco')
    })

    it('should return 404 for non-existent bank account', async function () {
      const res = await request(`/${MC_ID}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440099`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return 404 when bank account belongs to different company', async function () {
      // account1 belongs to MC_ID, requesting from another MC
      const otherMcId = '550e8400-e29b-41d4-a716-446655440099'
      const res = await request(`/${otherMcId}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440001`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('POST /:managementCompanyId/me/bank-accounts (create)', function () {
    it('should create a national bank account', async function () {
      const newAccount = {
        accountCategory: 'national',
        displayName: 'Mercantil - Ahorro (VES)',
        bankName: 'Mercantil',
        accountHolderName: 'Empresa Test C.A.',
        currency: 'VES',
        accountDetails: {
          accountNumber: '01050100011234567890',
          bankCode: '0105',
          accountType: 'ahorro',
          identityDocType: 'J',
          identityDocNumber: '12345678',
        },
        acceptedPaymentMethods: ['transfer'],
        appliesToAllCondominiums: true,
      }

      const res = await request(`/${MC_ID}/me/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
    })

    it('should create an international bank account', async function () {
      const newAccount = {
        accountCategory: 'international',
        displayName: 'Zelle - Company',
        bankName: 'Chase Bank',
        accountHolderName: 'Company LLC',
        currency: 'USD',
        accountDetails: {
          zelleEmail: 'payments@company.com',
        },
        acceptedPaymentMethods: ['zelle'],
        appliesToAllCondominiums: false,
        condominiumIds: ['550e8400-e29b-41d4-a716-446655440020'],
      }

      const res = await request(`/${MC_ID}/me/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      })
      expect(res.status).toBe(StatusCodes.CREATED)
    })
  })

  describe('PATCH /:managementCompanyId/me/bank-accounts/:bankAccountId/deactivate', function () {
    it('should deactivate an active bank account', async function () {
      const res = await request(`/${MC_ID}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440001/deactivate`, {
        method: 'PATCH',
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isActive).toBe(false)
    })

    it('should return 404 for non-existent bank account', async function () {
      // Override getById to return null for this test
      mockRepository.getById = async function () {
        return null
      }

      const res = await request(`/${MC_ID}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440099/deactivate`, {
        method: 'PATCH',
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return error when account already deactivated', async function () {
      // Override getById to return inactive account
      mockRepository.getById = async function () {
        return createTestBankAccount({
          id: '550e8400-e29b-41d4-a716-446655440001',
          isActive: false,
        })
      }

      const res = await request(`/${MC_ID}/me/bank-accounts/550e8400-e29b-41d4-a716-446655440001/deactivate`, {
        method: 'PATCH',
      })
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('Route definitions', function () {
    it('should have all expected routes defined', function () {
      const controller = new BankAccountsController(
        mockRepository as unknown as BankAccountsRepository,
        mockBanksRepository as unknown as BanksRepository,
        mockDb as any
      )
      const routes = controller.routes

      expect(routes).toHaveLength(4)

      // Verify route methods and paths
      expect(routes[0]!.method).toBe('get')
      expect(routes[0]!.path).toBe('/:managementCompanyId/me/bank-accounts')

      expect(routes[1]!.method).toBe('get')
      expect(routes[1]!.path).toBe('/:managementCompanyId/me/bank-accounts/:bankAccountId')

      expect(routes[2]!.method).toBe('post')
      expect(routes[2]!.path).toBe('/:managementCompanyId/me/bank-accounts')

      expect(routes[3]!.method).toBe('patch')
      expect(routes[3]!.path).toBe('/:managementCompanyId/me/bank-accounts/:bankAccountId/deactivate')
    })

    it('should have correct number of middlewares per route', function () {
      const controller = new BankAccountsController(
        mockRepository as unknown as BankAccountsRepository,
        mockBanksRepository as unknown as BanksRepository,
        mockDb as any
      )
      const routes = controller.routes

      // List: auth + params + requireRole + query
      expect(routes[0]!.middlewares).toHaveLength(4)
      // Detail: auth + params + requireRole
      expect(routes[1]!.middlewares).toHaveLength(3)
      // Create: auth + params + requireRole + body
      expect(routes[2]!.middlewares).toHaveLength(4)
      // Deactivate: auth + params + requireRole
      expect(routes[3]!.middlewares).toHaveLength(3)
    })
  })
})
