import { describe, it, expect, mock } from 'bun:test'
import { GeneratePaymentReceiptPdfService } from './generate-payment-receipt-pdf.service'

const mockPaymentsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockPaymentApplicationsRepo = {
  getByPaymentId: mock(() => Promise.resolve([] as unknown)),
}

const mockUnitsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockCondominiumsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockCurrenciesRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

function createService() {
  return new GeneratePaymentReceiptPdfService(
    mockPaymentsRepo as never,
    mockPaymentApplicationsRepo as never,
    mockUnitsRepo as never,
    mockCondominiumsRepo as never,
    mockCurrenciesRepo as never
  )
}

const basePayment = {
  id: 'payment-1',
  paymentNumber: 'PAG-001',
  userId: 'user-1',
  unitId: 'unit-1',
  amount: '500.00',
  currencyId: 'currency-1',
  paidAmount: '500.00',
  paidCurrencyId: 'currency-1',
  exchangeRate: null,
  paymentMethod: 'transfer' as const,
  paymentGatewayId: null,
  paymentDetails: null,
  paymentDate: '2026-03-15',
  registeredAt: new Date('2026-03-15'),
  status: 'completed' as const,
  receiptUrl: null,
  receiptNumber: null,
  notes: 'Transferencia BNC',
  metadata: null,
  registeredBy: 'admin-1',
  verifiedBy: 'admin-1',
  verifiedAt: new Date('2026-03-15'),
  verificationNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseUnit = {
  id: 'unit-1',
  buildingId: 'building-1',
  unitNumber: 'A-101',
  ownerName: 'Juan Pérez',
  condominiumId: 'condo-1',
}

const baseCondominium = {
  id: 'condo-1',
  name: 'Residencias Los Robles',
  rif: 'J-12345678-9',
  address: 'Av. Principal, Caracas',
}

const baseCurrency = {
  id: 'currency-1',
  code: 'VES',
  symbol: 'Bs.',
  name: 'Bolívar',
}

const baseApplications = [
  {
    id: 'app-1',
    paymentId: 'payment-1',
    quotaId: 'quota-1',
    appliedAmount: '300.00',
    appliedToPrincipal: '280.00',
    appliedToInterest: '20.00',
    registeredBy: 'admin-1',
    appliedAt: new Date('2026-03-15'),
  },
  {
    id: 'app-2',
    paymentId: 'payment-1',
    quotaId: 'quota-2',
    appliedAmount: '200.00',
    appliedToPrincipal: '200.00',
    appliedToInterest: '0',
    registeredBy: 'admin-1',
    appliedAt: new Date('2026-03-15'),
  },
]

describe('GeneratePaymentReceiptPdfService', () => {
  it('should generate a PDF buffer for a valid payment', async () => {
    mockPaymentsRepo.getById.mockResolvedValueOnce(basePayment)
    mockPaymentApplicationsRepo.getByPaymentId.mockResolvedValueOnce(baseApplications)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(baseCondominium)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = createService()
    const result = await service.execute('payment-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
      expect(result.data.filename).toContain('comprobante-pago-PAG-001')
      expect(result.data.contentType).toBe('application/pdf')
      expect(result.data.data.toString('ascii', 0, 5)).toBe('%PDF-')
    }
  })

  it('should return NOT_FOUND if payment does not exist', async () => {
    mockPaymentsRepo.getById.mockResolvedValueOnce(null)

    const service = createService()
    const result = await service.execute('nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND if unit does not exist', async () => {
    mockPaymentsRepo.getById.mockResolvedValueOnce(basePayment)
    mockPaymentApplicationsRepo.getByPaymentId.mockResolvedValueOnce(baseApplications)
    mockUnitsRepo.getById.mockResolvedValueOnce(null)

    const service = createService()
    const result = await service.execute('payment-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should handle payment with no applications', async () => {
    mockPaymentsRepo.getById.mockResolvedValueOnce(basePayment)
    mockPaymentApplicationsRepo.getByPaymentId.mockResolvedValueOnce([])
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(baseCondominium)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = createService()
    const result = await service.execute('payment-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
    }
  })

  it('should use payment id in filename when paymentNumber is null', async () => {
    const paymentNoNumber = { ...basePayment, paymentNumber: null }
    mockPaymentsRepo.getById.mockResolvedValueOnce(paymentNoNumber)
    mockPaymentApplicationsRepo.getByPaymentId.mockResolvedValueOnce(baseApplications)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(baseCondominium)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = createService()
    const result = await service.execute('payment-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filename).toContain('comprobante-pago-payment-1')
    }
  })
})
