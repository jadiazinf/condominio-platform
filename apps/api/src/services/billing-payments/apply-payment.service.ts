import type { TPaymentAllocation, TAllocationStrategy } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import type { ConvertPaymentCurrencyService } from './convert-payment-currency.service'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'
import type { AllocatePaymentFIFOService } from '../billing-ledger/allocate-payment-fifo.service'

type TPaymentsRepo = {
  getById: (id: string) => Promise<{ id: string; unitId: string; amount: string; currencyId: string; status: string } | null>
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>
}

export interface IApplyPaymentInput {
  paymentId: string
  condominiumId: string
  currencyId: string
  allocationStrategy?: TAllocationStrategy
  createdBy?: string
}

export interface IApplyPaymentOutput {
  allocations: TPaymentAllocation[]
  remaining: string
}

export class ApplyPaymentToChannelService {
  constructor(
    private paymentsRepo: TPaymentsRepo,
    private convertService: ConvertPaymentCurrencyService,
    private appendLedgerService: AppendLedgerEntryService,
    private allocateService: AllocatePaymentFIFOService,
  ) {}

  async execute(input: IApplyPaymentInput): Promise<TServiceResult<IApplyPaymentOutput>> {
    const { paymentId, condominiumId, currencyId } = input

    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

    // 1. Convert currency if needed
    const convertResult = await this.convertService.execute({
      paymentAmount: payment.amount,
      paymentCurrencyId: payment.currencyId,
      channelCurrencyId: currencyId,
    })
    if (!convertResult.success) return convertResult as any

    const amountInCurrency = convertResult.data.convertedAmount
    const exchangeRateId = convertResult.data.exchangeRateId

    // 2. Create credit ledger entry
    const entryResult = await this.appendLedgerService.execute({
      unitId: payment.unitId,
      condominiumId,
      entryDate: new Date().toISOString().split('T')[0]!,
      entryType: 'credit',
      amount: amountInCurrency,
      currencyId,
      description: `Pago recibido - ${paymentId}`,
      referenceType: 'payment',
      referenceId: paymentId,
      paymentAmount: payment.currencyId !== currencyId ? payment.amount : null,
      paymentCurrencyId: payment.currencyId !== currencyId ? payment.currencyId : null,
      exchangeRateId,
      createdBy: input.createdBy ?? null,
    })
    if (!entryResult.success) return entryResult as any

    // 3. FIFO allocation
    const allocResult = await this.allocateService.execute({
      paymentId,
      unitId: payment.unitId,
      condominiumId,
      amount: amountInCurrency,
      strategy: input.allocationStrategy ?? 'fifo',
      createdBy: input.createdBy ?? null,
    })
    if (!allocResult.success) return allocResult as any

    // 4. Update payment status
    await this.paymentsRepo.update(paymentId, {
      status: 'completed',
    })

    return success({
      allocations: allocResult.data.allocations,
      remaining: allocResult.data.remaining,
    })
  }
}
