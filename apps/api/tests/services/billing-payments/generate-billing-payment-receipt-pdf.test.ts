import { describe, it, expect } from 'bun:test'
import { GenerateBillingPaymentReceiptPdfService } from '@services/billing-payments/generate-billing-payment-receipt-pdf.service'

const mockPayment = {
  id: 'pay-1',
  paymentNumber: 'PAY-001',
  unitId: 'unit-1',
  amount: '165.00',
  currencyId: 'cur-1',
  paymentMethod: 'transfer',
  paymentDate: '2026-04-01',
  status: 'completed',
  receiptNumber: 'REF-123456',
}

function createDeps() {
  return {
    paymentsRepo: { getById: async (id: string) => id === 'pay-1' ? mockPayment : null } as never,
    allocationsRepo: {
      findByPayment: async () => [
        { id: 'alloc-1', chargeId: 'charge-1', allocatedAmount: '100.00', reversed: false },
        { id: 'alloc-2', chargeId: 'charge-2', allocatedAmount: '65.00', reversed: false },
      ],
    } as never,
    chargesRepo: {
      getById: async (id: string) => ({
        id, description: id === 'charge-1' ? 'Administración Mar 2026' : 'Electricidad Mar 2026',
      }),
    } as never,
    unitsRepo: { getById: async () => ({ id: 'unit-1', unitNumber: 'A-101', buildingId: 'bld-1' }) } as never,
    buildingsRepo: { getById: async () => ({ id: 'bld-1', name: 'Torre A' }) } as never,
    condominiumsRepo: { getById: async () => ({ id: 'condo-1', name: 'Residencias' }) } as never,
    currenciesRepo: { getById: async () => ({ id: 'cur-1', symbol: 'Bs.', code: 'VES' }) } as never,
  }
}

describe('GenerateBillingPaymentReceiptPdfService', () => {
  it('generates a valid PDF buffer', async () => {
    const deps = createDeps()
    const service = new GenerateBillingPaymentReceiptPdfService(
      deps.paymentsRepo, deps.allocationsRepo, deps.chargesRepo,
      deps.unitsRepo, deps.buildingsRepo, deps.condominiumsRepo, deps.currenciesRepo,
    )

    const result = await service.execute('pay-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
      expect(result.data.data.length).toBeGreaterThan(0)
      expect(result.data.contentType).toBe('application/pdf')
      expect(result.data.filename).toContain('PAY-001')
    }
  })

  it('fails if payment not found', async () => {
    const deps = createDeps()
    const service = new GenerateBillingPaymentReceiptPdfService(
      deps.paymentsRepo, deps.allocationsRepo, deps.chargesRepo,
      deps.unitsRepo, deps.buildingsRepo, deps.condominiumsRepo, deps.currenciesRepo,
    )

    const result = await service.execute('nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('handles payment with no allocations', async () => {
    const deps = createDeps()
    deps.allocationsRepo.findByPayment = (async () => []) as never

    const service = new GenerateBillingPaymentReceiptPdfService(
      deps.paymentsRepo, deps.allocationsRepo, deps.chargesRepo,
      deps.unitsRepo, deps.buildingsRepo, deps.condominiumsRepo, deps.currenciesRepo,
    )

    const result = await service.execute('pay-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Buffer)
    }
  })
})
