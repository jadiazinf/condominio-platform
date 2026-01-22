import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment, TUser, TUnit, TCurrency } from '@packages/domain'
import { CreatePaymentService } from '@src/services/payments'

type TMockPaymentsRepository = {
  create: (data: unknown) => Promise<TPayment>
}

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
}

type TMockUnitsRepository = {
  getById: (id: string) => Promise<TUnit | null>
}

type TMockCurrenciesRepository = {
  getById: (id: string) => Promise<TCurrency | null>
}

describe('CreatePaymentService', function () {
  let service: CreatePaymentService
  let mockPaymentsRepository: TMockPaymentsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockUnitsRepository: TMockUnitsRepository
  let mockCurrenciesRepository: TMockCurrenciesRepository

  const mockUser: TUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'firebase-uid-123',
    email: 'user@example.com',
    displayName: 'Test User',
    phoneCountryCode: null,
    phoneNumber: null,
    photoUrl: null,
    firstName: 'Test',
    lastName: 'User',
    idDocumentType: null,
    idDocumentNumber: null,
    address: null,
    locationId: null,
    preferredLanguage: 'es',
    preferredCurrencyId: null,
    isActive: true,
    isEmailVerified: false,
    lastLogin: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockUnit: TUnit = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    buildingId: '550e8400-e29b-41d4-a716-446655440003',
    unitNumber: 'A-101',
    floor: 1,
    areaM2: '100.00',
    bedrooms: 2,
    bathrooms: 1,
    parkingSpaces: 1,
    parkingIdentifiers: null,
    storageIdentifier: null,
    aliquotPercentage: '5.00',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockCurrency: TCurrency = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    isBaseCurrency: false,
    isActive: true,
    decimals: 2,
    registeredBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPayment: TPayment = {
    id: '550e8400-e29b-41d4-a716-446655440005',
    paymentNumber: 'PAY-001',
    userId: mockUser.id,
    unitId: mockUnit.id,
    amount: '100.00',
    currencyId: mockCurrency.id,
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2025-01-01',
    registeredAt: new Date(),
    status: 'pending_verification',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: mockUser.id,
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockPaymentsRepository = {
      create: async function (data: any) {
        return { ...mockPayment, ...data, status: data.status || 'pending_verification' }
      },
    }

    mockUsersRepository = {
      getById: async function (id: string) {
        return id === mockUser.id ? mockUser : null
      },
    }

    mockUnitsRepository = {
      getById: async function (id: string) {
        return id === mockUnit.id ? mockUnit : null
      },
    }

    mockCurrenciesRepository = {
      getById: async function (id: string) {
        return id === mockCurrency.id ? mockCurrency : null
      },
    }

    service = new CreatePaymentService(
      mockPaymentsRepository as never,
      mockUsersRepository as never,
      mockUnitsRepository as never,
      mockCurrenciesRepository as never
    )
  })

  describe('execute', function () {
    it('should create payment with pending_verification status for manual payment method', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('pending_verification')
        expect(result.data.message).toContain('pending manual verification')
      }
    })

    it('should create payment with pending status for gateway payment method', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'gateway',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('pending')
        expect(result.data.message).toContain('pending automatic processing')
      }
    })

    it('should fail when user not found', async function () {
      const result = await service.execute({
        userId: 'non-existent-user',
        unitId: mockUnit.id,
        amount: '100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toContain('User not found')
      }
    })

    it('should fail when unit not found', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: 'non-existent-unit',
        amount: '100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toContain('Unit not found')
      }
    })

    it('should fail when currency not found', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '100.00',
        currencyId: 'non-existent-currency',
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toContain('Currency not found')
      }
    })

    it('should fail when currency is not active', async function () {
      mockCurrenciesRepository.getById = async function () {
        return { ...mockCurrency, isActive: false }
      }

      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Currency is not active')
      }
    })

    it('should fail when amount is negative', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '-100.00',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('positive number')
      }
    })

    it('should fail when amount is zero', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        unitId: mockUnit.id,
        amount: '0',
        currencyId: mockCurrency.id,
        paymentMethod: 'transfer',
        paymentDate: '2025-01-01',
        registeredByUserId: mockUser.id,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('positive number')
      }
    })
  })
})
