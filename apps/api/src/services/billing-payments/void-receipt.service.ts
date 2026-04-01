import type { TBillingReceipt, TCharge, TPaymentAllocation } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'

type TReceiptsRepo = {
  getById: (id: string) => Promise<TBillingReceipt | null>
  update: (id: string, data: Partial<TBillingReceipt>) => Promise<TBillingReceipt | null>
}

type TChargesRepo = {
  findByReceipt: (receiptId: string) => Promise<TCharge[]>
  update: (id: string, data: Partial<TCharge>) => Promise<TCharge | null>
}

type TAllocationsRepo = {
  findByCharge: (chargeId: string) => Promise<TPaymentAllocation[]>
  update: (id: string, data: Partial<TPaymentAllocation>) => Promise<TPaymentAllocation | null>
}

export interface IVoidReceiptInput {
  receiptId: string
  voidReason: string
  createdBy?: string
}

export interface IVoidReceiptOutput {
  voidedReceipt: TBillingReceipt
}

export class VoidReceiptService {
  constructor(
    private receiptsRepo: TReceiptsRepo,
    private chargesRepo: TChargesRepo,
    private allocationsRepo: TAllocationsRepo,
    private appendLedgerService: AppendLedgerEntryService,
  ) {}

  async execute(input: IVoidReceiptInput): Promise<TServiceResult<IVoidReceiptOutput>> {
    const { receiptId, voidReason } = input

    if (voidReason.length < 10) {
      return failure('La razón de anulación debe tener al menos 10 caracteres', 'BAD_REQUEST')
    }

    const receipt = await this.receiptsRepo.getById(receiptId)
    if (!receipt) return failure('Recibo no encontrado', 'NOT_FOUND')
    if (receipt.status === 'voided') return failure('El recibo ya está anulado', 'CONFLICT')

    const charges = await this.chargesRepo.findByReceipt(receiptId)

    // 1. Void receipt
    await this.receiptsRepo.update(receiptId, {
      status: 'voided',
      voidReason,
    })

    // 2. Cancel charges and reverse allocations
    for (const charge of charges) {
      // Reverse any payment allocations
      const allocations = await this.allocationsRepo.findByCharge(charge.id)
      for (const alloc of allocations) {
        await this.allocationsRepo.update(alloc.id, {
          reversed: true,
          reversedAt: new Date(),
        })
      }

      // Cancel charge
      await this.chargesRepo.update(charge.id, {
        status: 'cancelled',
        paidAmount: '0',
        balance: '0',
      })

      // Create reversal ledger entry
      const reverseType = charge.isCredit ? 'debit' : 'credit'
      await this.appendLedgerService.execute({
        unitId: receipt.unitId,
        billingChannelId: receipt.billingChannelId,
        entryDate: new Date().toISOString().split('T')[0]!,
        entryType: reverseType,
        amount: charge.amount,
        currencyId: receipt.currencyId,
        description: `Anulación recibo ${receipt.receiptNumber} - ${charge.description ?? ''}`,
        referenceType: 'void_reversal',
        referenceId: charge.id,
        createdBy: input.createdBy ?? null,
      })
    }

    return success({
      voidedReceipt: { ...receipt, status: 'voided', voidReason },
    })
  }
}
