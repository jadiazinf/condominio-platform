import { describe, it, expect, beforeEach } from 'bun:test'
import { GenerateBillingReceiptPdfService } from '@services/billing-generation/generate-billing-receipt-pdf.service'

// ─── Mocks ───

const mockReceipt = {
  id: 'receipt-1',
  condominiumId: 'condo-1',
  unitId: 'unit-1',
  periodYear: 2026,
  periodMonth: 3,
  receiptNumber: 'REC-202603-001',
  status: 'issued',
  issuedAt: new Date('2026-03-15'),
  dueDate: '2026-03-31',
  subtotal: '150.00',
  reserveFundAmount: '15.00',
  previousBalance: '0.00',
  interestAmount: '0.00',
  lateFeeAmount: '0.00',
  discountAmount: '0.00',
  totalAmount: '165.00',
  currencyId: 'cur-1',
  replacesReceiptId: null,
  voidReason: null,
  notes: null,
}

const mockUnit = {
  id: 'unit-1',
  unitNumber: 'A-101',
  buildingId: 'bld-1',
}

const mockBuilding = {
  id: 'bld-1',
  name: 'Torre A',
}

const mockCondominium = {
  id: 'condo-1',
  name: 'Residencias Las Villas',
  rif: 'J-12345678-9',
  address: 'Av. Principal, Caracas',
}

const mockCurrency = {
  id: 'cur-1',
  symbol: 'Bs.',
  code: 'VES',
}

const mockCharges = [
  {
    id: 'charge-1',
    chargeTypeId: 'ct-1',
    description: 'Administración Marzo 2026',
    amount: '100.00',
    isCredit: false,
    status: 'pending',
  },
  {
    id: 'charge-2',
    chargeTypeId: 'ct-2',
    description: 'Electricidad Marzo 2026',
    amount: '50.00',
    isCredit: false,
    status: 'pending',
  },
]

const mockChargeTypes: Record<string, { id: string; name: string }> = {
  'ct-1': { id: 'ct-1', name: 'Administración' },
  'ct-2': { id: 'ct-2', name: 'Electricidad' },
}

const createMockRepos = () => ({
  receiptsRepo: { getById: async (id: string) => id === 'receipt-1' ? mockReceipt : null } as never,
  chargesRepo: { findByReceipt: async () => mockCharges } as never,
  chargeTypesRepo: { getById: async (id: string) => mockChargeTypes[id] ?? null } as never,
  unitsRepo: { getById: async () => mockUnit } as never,
  buildingsRepo: { getById: async () => mockBuilding } as never,
  condominiumsRepo: { getById: async () => mockCondominium } as never,
  currenciesRepo: { getById: async () => mockCurrency } as never,
})

describe('GenerateBillingReceiptPdfService', () => {
  let service: GenerateBillingReceiptPdfService
  let repos: ReturnType<typeof createMockRepos>

  beforeEach(() => {
    repos = createMockRepos()
    service = new GenerateBillingReceiptPdfService(
      repos.receiptsRepo,
      repos.chargesRepo,
      repos.chargeTypesRepo,
      repos.unitsRepo,
      repos.buildingsRepo,
      repos.condominiumsRepo,
      repos.currenciesRepo,
    )
  })

  it('should generate a valid PDF buffer', async () => {
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
      expect(result.data.data.length).toBeGreaterThan(0)
      expect(result.data.contentType).toBe('application/pdf')
    }
  })

  it('should generate correct filename', async () => {
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filename).toContain('recibo')
      expect(result.data.filename).toContain('residencias-las-villas')
      expect(result.data.filename).toContain('a-101')
      expect(result.data.filename).toContain('Marzo')
      expect(result.data.filename).toContain('2026')
      expect(result.data.filename).toEndWith('.pdf')
    }
  })

  it('should fail if receipt not found', async () => {
    const result = await service.execute('nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should fail if unit not found', async () => {
    repos.unitsRepo.getById = async () => null as never
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should handle receipt with no charges', async () => {
    repos.chargesRepo.findByReceipt = async () => [] as never
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
    }
  })
})
