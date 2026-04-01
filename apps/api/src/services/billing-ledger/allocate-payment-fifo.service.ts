import type { TCharge, TPaymentAllocation, TAllocationStrategy } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

type TChargesRepo = {
  findPendingByUnitAndChannel: (unitId: string, channelId: string, orderAsc?: boolean) => Promise<TCharge[]>
  update: (id: string, data: Partial<TCharge>) => Promise<TCharge | null>
}

type TAllocationsRepo = {
  create: (data: Omit<TPaymentAllocation, 'id' | 'allocatedAt'>) => Promise<TPaymentAllocation>
}

type TReceiptsRepo = {
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>
}

export interface IAllocatePaymentFIFOInput {
  paymentId: string
  unitId: string
  billingChannelId: string
  amount: string
  strategy: TAllocationStrategy
  createdBy?: string | null
}

export interface IAllocatePaymentFIFOOutput {
  allocations: TPaymentAllocation[]
  remaining: string
}

export class AllocatePaymentFIFOService {
  private chargesRepo: TChargesRepo
  private allocationsRepo: TAllocationsRepo
  private receiptsRepo: TReceiptsRepo

  constructor(
    chargesRepo: TChargesRepo,
    allocationsRepo: TAllocationsRepo,
    receiptsRepo: TReceiptsRepo,
  ) {
    this.chargesRepo = chargesRepo
    this.allocationsRepo = allocationsRepo
    this.receiptsRepo = receiptsRepo
  }

  async execute(
    input: IAllocatePaymentFIFOInput
  ): Promise<TServiceResult<IAllocatePaymentFIFOOutput>> {
    let remaining = parseAmount(input.amount)

    if (remaining <= 0) {
      return failure('El monto debe ser mayor a 0', 'BAD_REQUEST')
    }

    const pendingCharges = await this.chargesRepo.findPendingByUnitAndChannel(
      input.unitId,
      input.billingChannelId,
      true // order ASC by createdAt (oldest first)
    )

    const allocations: TPaymentAllocation[] = []

    for (const charge of pendingCharges) {
      if (remaining <= 0) break

      const chargeBalance = parseAmount(charge.balance)
      if (chargeBalance <= 0) continue

      const allocatable = Math.min(remaining, chargeBalance)

      const allocation = await this.allocationsRepo.create({
        paymentId: input.paymentId,
        chargeId: charge.id,
        allocatedAmount: toDecimal(allocatable),
        reversed: false,
        reversedAt: null,
        createdBy: input.createdBy ?? null,
      })
      allocations.push(allocation)

      const newPaidAmount = parseAmount(charge.paidAmount) + allocatable
      const newBalance = parseAmount(charge.amount) - newPaidAmount
      const newStatus = newBalance <= 0.005 ? 'paid' : 'partial' // tolerance for floating point

      await this.chargesRepo.update(charge.id, {
        paidAmount: toDecimal(newPaidAmount),
        balance: toDecimal(Math.max(0, newBalance)),
        status: newStatus,
      })

      remaining -= allocatable
    }

    return success({
      allocations,
      remaining: toDecimal(Math.max(0, remaining)),
    })
  }
}
