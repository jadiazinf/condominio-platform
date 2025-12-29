import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCondominium } from '@packages/domain'
import { GetCondominiumByCodeService } from '@src/services/condominiums'

type TMockRepository = {
  getByCode: (code: string) => Promise<TCondominium | null>
}

describe('GetCondominiumByCodeService', function () {
  let service: GetCondominiumByCodeService
  let mockRepository: TMockRepository

  const mockCondominium: TCondominium = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Condominium',
    code: 'CONDO-001',
    managementCompanyId: '550e8400-e29b-41d4-a716-446655440010',
    address: '123 Condominium Street',
    locationId: '550e8400-e29b-41d4-a716-446655440020',
    email: 'admin@testcondo.com',
    phone: '+1234567890',
    defaultCurrencyId: '550e8400-e29b-41d4-a716-446655440030',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByCode: async function (code: string) {
        if (code === 'CONDO-001') {
          return mockCondominium
        }
        return null
      },
    }
    service = new GetCondominiumByCodeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return condominium when found by code', async function () {
      const result = await service.execute({ code: 'CONDO-001' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('CONDO-001')
        expect(result.data.id).toBe(mockCondominium.id)
      }
    })

    it('should return NOT_FOUND error when condominium does not exist', async function () {
      const result = await service.execute({ code: 'NONEXISTENT' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Condominium not found')
      }
    })
  })
})
