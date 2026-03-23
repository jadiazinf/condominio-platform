import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { SendReceiptEmailService } from './send-receipt-email.service'

const mockEmailService = {
  execute: mock((..._args: unknown[]) =>
    Promise.resolve({ success: true, data: { id: 'email-123' } } as unknown)
  ),
}

describe('SendReceiptEmailService', () => {
  beforeEach(() => {
    mockEmailService.execute.mockResolvedValue({
      success: true,
      data: { id: 'email-123' },
    })
  })

  it('should send a receipt email successfully', async () => {
    const service = new SendReceiptEmailService(mockEmailService as never)
    const result = await service.execute({
      to: 'resident@test.com',
      recipientName: 'Juan Pérez',
      condominiumName: 'Residencias Los Robles',
      receiptNumber: 'REC-202603-0001',
      periodLabel: 'Marzo 2026',
      totalAmount: '335.00',
      currencySymbol: 'Bs.',
      breakdown: [
        { label: 'Cuota de condominio', amount: '150.00' },
        { label: 'Cuota extraordinaria', amount: '50.00' },
      ],
      amounts: {
        ordinary: '150.00',
        extraordinary: '50.00',
        reserveFund: '20.00',
        interest: '10.00',
        fines: '5.00',
        previousBalance: '100.00',
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.emailId).toBe('email-123')
    }
    expect(mockEmailService.execute).toHaveBeenCalledTimes(1)
  })

  it('should include receipt details in the email subject', async () => {
    const service = new SendReceiptEmailService(mockEmailService as never)
    await service.execute({
      to: 'resident@test.com',
      recipientName: 'Juan Pérez',
      condominiumName: 'Residencias Los Robles',
      receiptNumber: 'REC-202603-0001',
      periodLabel: 'Marzo 2026',
      totalAmount: '335.00',
      currencySymbol: 'Bs.',
    })

    const call = mockEmailService.execute.mock.calls[0]![0] as Record<string, string>
    expect(call.subject).toContain('REC-202603-0001')
    expect(call.subject).toContain('Marzo 2026')
  })

  it('should include amount in the email body', async () => {
    const service = new SendReceiptEmailService(mockEmailService as never)
    await service.execute({
      to: 'resident@test.com',
      recipientName: 'Juan Pérez',
      condominiumName: 'Residencias Los Robles',
      receiptNumber: 'REC-202603-0001',
      periodLabel: 'Marzo 2026',
      totalAmount: '335.00',
      currencySymbol: 'Bs.',
    })

    const call = mockEmailService.execute.mock.calls[0]![0] as Record<string, string>
    expect(call.html).toContain('335.00')
    expect(call.html).toContain('Bs.')
  })

  it('should return failure when email service fails', async () => {
    mockEmailService.execute.mockResolvedValueOnce({
      success: false,
      error: 'SMTP error',
      code: 'INTERNAL_ERROR',
    })

    const service = new SendReceiptEmailService(mockEmailService as never)
    const result = await service.execute({
      to: 'resident@test.com',
      recipientName: 'Juan Pérez',
      condominiumName: 'Residencias Los Robles',
      receiptNumber: 'REC-202603-0001',
      periodLabel: 'Marzo 2026',
      totalAmount: '335.00',
      currencySymbol: 'Bs.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('INTERNAL_ERROR')
    }
  })
})
