import { describe, it, expect, beforeEach } from 'bun:test'
import { UpdatePreferredCurrencyService } from '@services/management-companies/update-preferred-currency.service'
import type { ManagementCompaniesRepository } from '@database/repositories'
import type { CurrenciesRepository } from '@database/repositories'

const COMPANY_ID = '11111111-1111-1111-1111-111111111111'
const CURRENCY_ID = '22222222-2222-2222-2222-222222222222'
const VES_CURRENCY_ID = '33333333-3333-3333-3333-333333333333'

function createMockCompaniesRepo(overrides: Partial<ManagementCompaniesRepository> = {}) {
  return {
    getById: async (id: string) =>
      id === COMPANY_ID
        ? {
            id: COMPANY_ID,
            name: 'Test Company',
            preferredCurrencyId: null,
            isActive: true,
          }
        : null,
    update: async (id: string, data: Record<string, unknown>) => ({
      id,
      name: 'Test Company',
      preferredCurrencyId: data.preferredCurrencyId ?? null,
      isActive: true,
    }),
    ...overrides,
  } as never as ManagementCompaniesRepository
}

function createMockCurrenciesRepo(overrides: Partial<CurrenciesRepository> = {}) {
  return {
    getById: async (id: string) =>
      id === CURRENCY_ID
        ? { id: CURRENCY_ID, code: 'USD', name: 'US Dollar', symbol: '$', isActive: true }
        : id === VES_CURRENCY_ID
          ? { id: VES_CURRENCY_ID, code: 'VES', name: 'Bolívar', symbol: 'Bs.', isActive: true }
          : null,
    ...overrides,
  } as never as CurrenciesRepository
}

describe('UpdatePreferredCurrencyService', () => {
  let service: UpdatePreferredCurrencyService

  beforeEach(() => {
    service = new UpdatePreferredCurrencyService(
      createMockCompaniesRepo(),
      createMockCurrenciesRepo()
    )
  })

  it('updates preferred currency successfully', async () => {
    const result = await service.execute({
      managementCompanyId: COMPANY_ID,
      currencyId: CURRENCY_ID,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.preferredCurrencyId).toBe(CURRENCY_ID)
    }
  })

  it('returns NOT_FOUND when company does not exist', async () => {
    const result = await service.execute({
      managementCompanyId: '99999999-9999-9999-9999-999999999999',
      currencyId: CURRENCY_ID,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('returns NOT_FOUND when currency does not exist', async () => {
    const result = await service.execute({
      managementCompanyId: COMPANY_ID,
      currencyId: '99999999-9999-9999-9999-999999999999',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('returns BAD_REQUEST when currency is inactive', async () => {
    service = new UpdatePreferredCurrencyService(
      createMockCompaniesRepo(),
      createMockCurrenciesRepo({
        getById: async () => ({
          id: CURRENCY_ID,
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          isActive: false,
          isBaseCurrency: false,
          decimals: 2,
          registeredBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })
    )

    const result = await service.execute({
      managementCompanyId: COMPANY_ID,
      currencyId: CURRENCY_ID,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('allows setting preferred currency to null (reset to default)', async () => {
    const result = await service.execute({
      managementCompanyId: COMPANY_ID,
      currencyId: null,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.preferredCurrencyId).toBeNull()
    }
  })
})
