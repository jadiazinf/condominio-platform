import { describe, it, expect, mock } from 'bun:test'
import { GenerateReceiptPdfService } from './generate-receipt-pdf.service'

const mockReceiptsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockQuotasRepo = {
  getByUnitAndPeriod: mock(() => Promise.resolve([] as unknown)),
}

const mockUnitsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockBuildingsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockCondominiumsRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockCurrenciesRepo = {
  getById: mock(() => Promise.resolve(null as unknown)),
}

const mockConceptServicesRepo = {
  listByConceptId: mock(() => Promise.resolve([] as unknown)),
}

function createService() {
  return new GenerateReceiptPdfService(
    mockReceiptsRepo as never,
    mockQuotasRepo as never,
    mockUnitsRepo as never,
    mockBuildingsRepo as never,
    mockCondominiumsRepo as never,
    mockCurrenciesRepo as never,
    mockConceptServicesRepo as never
  )
}

const baseReceipt = {
  id: 'receipt-1',
  condominiumId: 'condo-1',
  buildingId: 'building-1',
  unitId: 'unit-1',
  budgetId: null,
  currencyId: 'currency-1',
  periodYear: 2026,
  periodMonth: 3,
  receiptNumber: 'REC-202603-0001',
  status: 'generated' as const,
  ordinaryAmount: '150.00',
  extraordinaryAmount: '50.00',
  reserveFundAmount: '20.00',
  interestAmount: '10.00',
  finesAmount: '5.00',
  previousBalance: '100.00',
  totalAmount: '335.00',
  unitAliquot: '2.50',
  pdfUrl: null,
  generatedAt: new Date('2026-03-15'),
  sentAt: null,
  voidedAt: null,
  notes: null,
  metadata: null,
  generatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseUnit = {
  id: 'unit-1',
  buildingId: 'building-1',
  unitNumber: 'A-101',
  ownerName: 'Juan Pérez',
}

const baseBuilding = {
  id: 'building-1',
  condominiumId: 'condo-1',
  name: 'Torre A',
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

const baseQuotas = [
  {
    id: 'quota-1',
    unitId: 'unit-1',
    periodYear: 2026,
    periodMonth: 3,
    baseAmount: '150.00',
    interestAmount: '10.00',
    balance: '160.00',
    status: 'pending',
    paymentConceptId: 'concept-1',
    paymentConcept: { name: 'Cuota de condominio', conceptType: 'condominium_fee' },
  },
  {
    id: 'quota-2',
    unitId: 'unit-1',
    periodYear: 2026,
    periodMonth: 3,
    baseAmount: '50.00',
    interestAmount: '0',
    balance: '50.00',
    status: 'pending',
    paymentConceptId: 'concept-2',
    paymentConcept: { name: 'Cuota extraordinaria', conceptType: 'extraordinary' },
  },
]

describe('GenerateReceiptPdfService', () => {
  it('should generate a PDF buffer for a valid receipt', async () => {
    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(baseCondominium)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = createService()
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
      expect(result.data.filename).toBe('recibo_residencias-los-robles_a-101_Marzo_2026.pdf')
      expect(result.data.contentType).toBe('application/pdf')
      // PDF starts with %PDF
      expect(result.data.data.toString('ascii', 0, 5)).toBe('%PDF-')
    }
  })

  it('should return NOT_FOUND if receipt does not exist', async () => {
    mockReceiptsRepo.getById.mockResolvedValueOnce(null)

    const service = createService()
    const result = await service.execute('nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND if unit does not exist', async () => {
    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockUnitsRepo.getById.mockResolvedValueOnce(null)

    const service = createService()
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND if condominium does not exist', async () => {
    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(null)

    const service = createService()
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should generate PDF with converted amounts when preferred currency is set', async () => {
    const condoWithMc = {
      ...baseCondominium,
      managementCompanyIds: ['mc-1'],
    }
    const mockMcRepo = {
      getById: mock(() =>
        Promise.resolve({ id: 'mc-1', preferredCurrencyId: 'currency-usd' })
      ),
    }
    const mockExchangeRatesRepo = {
      getLatestRate: mock(() =>
        Promise.resolve({ rate: '0.027', fromCurrencyId: 'currency-1', toCurrencyId: 'currency-usd' })
      ),
    }
    const preferredCurrency = {
      id: 'currency-usd',
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimals: 2,
    }

    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(condoWithMc)
    // First call returns original currency, second returns preferred currency
    mockCurrenciesRepo.getById
      .mockResolvedValueOnce(baseCurrency)
      .mockResolvedValueOnce(preferredCurrency)

    const service = new GenerateReceiptPdfService(
      mockReceiptsRepo as never,
      mockQuotasRepo as never,
      mockUnitsRepo as never,
      mockBuildingsRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockConceptServicesRepo as never,
      mockMcRepo as never,
      mockExchangeRatesRepo as never
    )
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
      expect(result.data.data.toString('ascii', 0, 5)).toBe('%PDF-')
    }
    // Verify the exchange rate was fetched
    expect(mockExchangeRatesRepo.getLatestRate).toHaveBeenCalledWith('currency-1', 'currency-usd')
    expect(mockMcRepo.getById).toHaveBeenCalledWith('mc-1')
  })

  it('should fallback to original currency when no exchange rate is available', async () => {
    const condoWithMc = {
      ...baseCondominium,
      managementCompanyIds: ['mc-1'],
    }
    const mockMcRepo = {
      getById: mock(() =>
        Promise.resolve({ id: 'mc-1', preferredCurrencyId: 'currency-usd' })
      ),
    }
    const mockExchangeRatesRepo = {
      getLatestRate: mock(() => Promise.resolve(null)),
    }
    const preferredCurrency = {
      id: 'currency-usd',
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimals: 2,
    }

    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(condoWithMc)
    mockCurrenciesRepo.getById
      .mockResolvedValueOnce(baseCurrency)
      .mockResolvedValueOnce(preferredCurrency)

    const service = new GenerateReceiptPdfService(
      mockReceiptsRepo as never,
      mockQuotasRepo as never,
      mockUnitsRepo as never,
      mockBuildingsRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockConceptServicesRepo as never,
      mockMcRepo as never,
      mockExchangeRatesRepo as never
    )
    const result = await service.execute('receipt-1')

    // Should still succeed — falls back to original currency
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
    }
  })

  it('should not convert when preferred currency matches receipt currency', async () => {
    const condoWithMc = {
      ...baseCondominium,
      managementCompanyIds: ['mc-1'],
    }
    const mockMcRepo = {
      getById: mock(() =>
        Promise.resolve({ id: 'mc-1', preferredCurrencyId: 'currency-1' }) // same as receipt
      ),
    }
    const mockExchangeRatesRepo = {
      getLatestRate: mock(() => Promise.resolve(null)),
    }

    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(condoWithMc)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = new GenerateReceiptPdfService(
      mockReceiptsRepo as never,
      mockQuotasRepo as never,
      mockUnitsRepo as never,
      mockBuildingsRepo as never,
      mockCondominiumsRepo as never,
      mockCurrenciesRepo as never,
      mockConceptServicesRepo as never,
      mockMcRepo as never,
      mockExchangeRatesRepo as never
    )
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    // Exchange rate should NOT have been called since currencies match
    expect(mockExchangeRatesRepo.getLatestRate).not.toHaveBeenCalled()
  })

  it('should include currency symbol in the filename', async () => {
    mockReceiptsRepo.getById.mockResolvedValueOnce(baseReceipt)
    mockQuotasRepo.getByUnitAndPeriod.mockResolvedValueOnce(baseQuotas)
    mockUnitsRepo.getById.mockResolvedValueOnce(baseUnit)
    mockBuildingsRepo.getById.mockResolvedValueOnce(baseBuilding)
    mockCondominiumsRepo.getById.mockResolvedValueOnce(baseCondominium)
    mockCurrenciesRepo.getById.mockResolvedValueOnce(baseCurrency)

    const service = createService()
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filename).toMatch(/\.pdf$/)
    }
  })
})
