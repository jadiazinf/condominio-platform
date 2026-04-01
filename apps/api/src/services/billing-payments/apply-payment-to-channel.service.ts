import type { TBillingChannel, TPaymentAllocation } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import type { ConvertPaymentCurrencyService } from './convert-payment-currency.service'
import type { AppendLedgerEntryService } from '../billing-ledger/append-ledger-entry.service'
import type { AllocatePaymentFIFOService } from '../billing-ledger/allocate-payment-fifo.service'
import type { ApplyLateFeeService } from '../billing-fees/apply-late-fee.service'
import type { ApplyEarlyPaymentDiscountService } from '../billing-fees/apply-early-payment-discount.service'

type TBillingChannelsRepo = {
  getById: (id: string) => Promise<TBillingChannel | null>
}

type TPaymentsRepo = {
  getById: (id: string) => Promise<{ id: string; unitId: string; amount: string; currencyId: string; status: string } | null>
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>
}

type TReceiptsRepo = {
  findByUnitAndChannel: (unitId: string, channelId: string) => Promise<any[]>
}

export interface IApplyPaymentInput {
  paymentId: string
  channelId: string
  createdBy?: string
}

export interface IApplyPaymentOutput {
  allocations: TPaymentAllocation[]
  remaining: string
}

export class ApplyPaymentToChannelService {
  constructor(
    private billingChannelsRepo: TBillingChannelsRepo,
    private paymentsRepo: TPaymentsRepo,
    private convertService: ConvertPaymentCurrencyService,
    private appendLedgerService: AppendLedgerEntryService,
    private allocateService: AllocatePaymentFIFOService,
    private applyLateFeeService: ApplyLateFeeService,
    private applyDiscountService: ApplyEarlyPaymentDiscountService,
    private receiptsRepo: TReceiptsRepo,
  ) {}

  async execute(input: IApplyPaymentInput): Promise<TServiceResult<IApplyPaymentOutput>> {
    const { paymentId, channelId } = input

    const channel = await this.billingChannelsRepo.getById(channelId)
    if (!channel) return failure('Canal no encontrado', 'NOT_FOUND')

    const payment = await this.paymentsRepo.getById(paymentId)
    if (!payment) return failure('Pago no encontrado', 'NOT_FOUND')

    // 1. Convert currency if needed
    const convertResult = await this.convertService.execute({
      paymentAmount: payment.amount,
      paymentCurrencyId: payment.currencyId,
      channelCurrencyId: channel.currencyId,
    })
    if (!convertResult.success) return convertResult as any

    const amountInChannelCurrency = convertResult.data.convertedAmount
    const exchangeRateId = convertResult.data.exchangeRateId

    // 2. Create credit ledger entry
    const entryResult = await this.appendLedgerService.execute({
      unitId: payment.unitId,
      billingChannelId: channelId,
      entryDate: new Date().toISOString().split('T')[0]!,
      entryType: 'credit',
      amount: amountInChannelCurrency,
      currencyId: channel.currencyId,
      description: `Pago recibido - ${paymentId}`,
      referenceType: 'payment',
      referenceId: paymentId,
      paymentAmount: payment.currencyId !== channel.currencyId ? payment.amount : null,
      paymentCurrencyId: payment.currencyId !== channel.currencyId ? payment.currencyId : null,
      exchangeRateId,
      createdBy: input.createdBy ?? null,
    })
    if (!entryResult.success) return entryResult as any

    // 3. FIFO allocation
    const allocResult = await this.allocateService.execute({
      paymentId,
      unitId: payment.unitId,
      billingChannelId: channelId,
      amount: amountInChannelCurrency,
      strategy: channel.allocationStrategy ?? 'fifo',
      createdBy: input.createdBy ?? null,
    })
    if (!allocResult.success) return allocResult as any

    // 4. Update payment
    await this.paymentsRepo.update(paymentId, {
      billingChannelId: channelId,
      status: 'completed',
    })

    return success({
      allocations: allocResult.data.allocations,
      remaining: allocResult.data.remaining,
    })
  }
}
