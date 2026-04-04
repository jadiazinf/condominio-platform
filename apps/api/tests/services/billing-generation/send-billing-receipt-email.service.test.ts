import { describe, it, expect, beforeEach } from 'bun:test'
import { SendBillingReceiptEmailService } from '@services/billing-generation/send-billing-receipt-email.service'

// ─── Mocks ───

const mockReceipt = {
  id: 'receipt-1',
  condominiumId: 'condo-1',
  unitId: 'unit-1',
  periodYear: 2026,
  periodMonth: 3,
  receiptNumber: 'REC-202603-001',
  status: 'issued',
  subtotal: '150.00',
  reserveFundAmount: '15.00',
  previousBalance: '0.00',
  interestAmount: '0.00',
  lateFeeAmount: '0.00',
  discountAmount: '0.00',
  totalAmount: '165.00',
  currencyId: 'cur-1',
}

const mockCondominium = { id: 'condo-1', name: 'Residencias Las Villas' }
const mockCurrency = { id: 'cur-1', symbol: 'Bs.', code: 'VES' }

const mockOwnerships = [
  { email: 'owner@test.com', fullName: 'Juan Pérez', ownershipType: 'owner' },
  { email: 'tenant@test.com', fullName: 'María López', ownershipType: 'tenant' },
]

const createMockDeps = () => {
  const sentEmails: Array<{ to: string }> = []

  return {
    receiptsRepo: { getById: async (id: string) => id === 'receipt-1' ? mockReceipt : null } as never,
    condominiumsRepo: { getById: async () => mockCondominium } as never,
    unitsRepo: { getById: async () => ({ id: 'unit-1' }) } as never,
    unitOwnershipsRepo: { getByUnitId: async () => mockOwnerships } as never,
    currenciesRepo: { getById: async () => mockCurrency } as never,
    emailService: {
      execute: async (input: { to: string }) => {
        sentEmails.push(input)
        return { success: true, data: { emailId: `email-${sentEmails.length}` } }
      },
    } as never,
    sentEmails,
  }
}

describe('SendBillingReceiptEmailService', () => {
  let service: SendBillingReceiptEmailService
  let deps: ReturnType<typeof createMockDeps>

  beforeEach(() => {
    deps = createMockDeps()
    service = new SendBillingReceiptEmailService(
      deps.receiptsRepo,
      deps.condominiumsRepo,
      deps.unitsRepo,
      deps.unitOwnershipsRepo,
      deps.currenciesRepo,
      deps.emailService,
    )
  })

  it('should send email to owners only (not tenants)', async () => {
    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailsSent).toBe(1)
      expect(deps.sentEmails).toHaveLength(1)
      expect(deps.sentEmails[0]!.to).toBe('owner@test.com')
    }
  })

  it('should send to multiple owners', async () => {
    deps.unitOwnershipsRepo.getByUnitId = (async () => [
      { email: 'owner1@test.com', fullName: 'Owner 1', ownershipType: 'owner' },
      { email: 'owner2@test.com', fullName: 'Owner 2', ownershipType: 'co-owner' },
    ]) as never

    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailsSent).toBe(2)
    }
  })

  it('should fail if receipt not found', async () => {
    const result = await service.execute('nonexistent')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should fail if no owners with email', async () => {
    deps.unitOwnershipsRepo.getByUnitId = (async () => [
      { email: null, fullName: 'No Email', ownershipType: 'owner' },
    ]) as never

    const result = await service.execute('receipt-1')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should count only successful emails', async () => {
    let callCount = 0
    deps.emailService.execute = (async () => {
      callCount++
      if (callCount === 1) return { success: false, error: 'SMTP error', code: 'INTERNAL_ERROR' }
      return { success: true, data: { emailId: 'ok' } }
    }) as never

    deps.unitOwnershipsRepo.getByUnitId = (async () => [
      { email: 'fail@test.com', fullName: 'Fail', ownershipType: 'owner' },
      { email: 'ok@test.com', fullName: 'OK', ownershipType: 'owner' },
    ]) as never

    const result = await service.execute('receipt-1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailsSent).toBe(1) // only the successful one
    }
  })

})
