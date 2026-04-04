import type { TPayment } from '@packages/domain'
import type {
  PaymentsRepository,
  ChargesRepository,
} from '@database/repositories'
import type { PaymentAllocationsV2Repository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

export interface IRefundBillingPaymentInput {
  paymentId: string
  refundReason: string
  refundedByUserId: string
}

export interface IRefundBillingPaymentOutput {
  payment: TPayment
  reversedAllocations: number
  message: string
}

/**
 * Refunds a billing payment:
 * 1. Validates payment is completed
 * 2. Reverses each payment_allocation (restores charge.paidAmount/balance/status)
 * 3. Creates debit ledger entry (reverso) per allocation
 * 4. Updates payment status to 'refunded'
 */
export class RefundBillingPaymentService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly allocationsRepo: PaymentAllocationsV2Repository,
    private readonly chargesRepo: ChargesRepository,
    private readonly appendLedgerService: AppendLedgerEntryService,
  ) {}

  async execute(input: IRefundBillingPaymentInput): Promise<TServiceResult<IRefundBillingPaymentOutput>> {
    const { paymentId, refundReason, refundedByUserId } = input

    // 1. Validate payment
    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

    if (payment.status !== 'completed') {
      return failure(
        `Solo pagos completados pueden reembolsarse. Estado actual: ${payment.status}`,
        'BAD_REQUEST',
      )
    }

    if (!refundReason || refundReason.trim().length < 10) {
      return failure('La razón del reembolso debe tener al menos 10 caracteres', 'BAD_REQUEST')
    }

    // 2. Get allocations for this payment
    const allocations = await this.allocationsRepo.findByPayment(paymentId)

    // 3. Transaction: reverse allocations + create ledger entries + update payment
    return await this.db.transaction(async tx => {
      const txPaymentsRepo = this.paymentsRepo.withTx(tx)
      const txAllocationsRepo = this.allocationsRepo.withTx(tx)
      const txChargesRepo = this.chargesRepo.withTx(tx)

      let reversedCount = 0

      for (const allocation of allocations) {
        if (allocation.reversed) continue

        // Restore charge balance
        const charge = await txChargesRepo.getById(allocation.chargeId)
        if (charge) {
          const currentPaid = parseAmount(charge.paidAmount)
          const allocatedAmount = parseAmount(allocation.allocatedAmount)
          const newPaid = Math.max(0, currentPaid - allocatedAmount)
          const newBalance = toDecimal(parseAmount(charge.amount) - newPaid)
          const newStatus = newPaid === 0 ? 'pending' : 'partial'

          await txChargesRepo.update(charge.id, {
            paidAmount: toDecimal(newPaid),
            balance: newBalance,
            status: newStatus,
          })

          // Create debit ledger entry (reverso)
          await this.appendLedgerService.execute({
            unitId: charge.unitId,
            condominiumId: charge.condominiumId,
            entryDate: new Date().toISOString().split('T')[0]!,
            entryType: 'debit',
            amount: allocation.allocatedAmount,
            currencyId: charge.currencyId,
            description: `Reverso reembolso: ${refundReason}`,
            referenceType: 'void_reversal',
            referenceId: paymentId,
            createdBy: refundedByUserId,
          })
        }

        // Mark allocation as reversed
        await txAllocationsRepo.update(allocation.id, {
          reversed: true,
          reversedAt: new Date(),
        })

        reversedCount++
      }

      // 4. Update payment status
      const updatedPayment = await txPaymentsRepo.update(paymentId, {
        status: 'refunded',
        notes: `[REEMBOLSO] ${refundReason} | Por: ${refundedByUserId} | ${new Date().toISOString()}`,
      })

      if (!updatedPayment) {
        return failure('Error actualizando estado del pago', 'INTERNAL_ERROR')
      }

      return success({
        payment: updatedPayment,
        reversedAllocations: reversedCount,
        message: `Pago reembolsado. ${reversedCount} asignación(es) revertida(s).`,
      })
    })
  }
}
