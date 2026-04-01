import type { TBillingChannel } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'
import type { CreateChargeWithLedgerEntryService } from '../billing-ledger/create-charge-with-ledger-entry.service'

type TBillingChannelsRepo = {
  getById: (id: string) => Promise<TBillingChannel | null>
}

type TUnitsRepo = {
  findByCondominium: (condoId: string, opts?: { active: boolean }) => Promise<TUnit[]>
  findByBuilding: (buildingId: string, opts?: { active: boolean }) => Promise<TUnit[]>
}

type TUnit = {
  id: string
  unitNumber: string
  aliquotPercentage: string | null
  buildingId: string
  isActive: boolean
}

export interface IGenerateStandaloneInput {
  channelId: string
  chargeTypeId: string
  periodYear: number
  periodMonth: number
  amount: string
  description?: string
  createdBy?: string
}

export interface IGenerateStandaloneOutput {
  chargesCreated: number
}

export class GenerateStandaloneChargeService {
  constructor(
    private billingChannelsRepo: TBillingChannelsRepo,
    private unitsRepo: TUnitsRepo,
    private createChargeService: CreateChargeWithLedgerEntryService,
  ) {}

  async execute(
    input: IGenerateStandaloneInput
  ): Promise<TServiceResult<IGenerateStandaloneOutput>> {
    const channel = await this.billingChannelsRepo.getById(input.channelId)
    if (!channel) return failure('Canal no encontrado', 'NOT_FOUND')
    if (!channel.isActive) return failure('Canal inactivo', 'BAD_REQUEST')
    if (channel.channelType !== 'standalone') {
      return failure('Use GenerateChannelPeriod para canales tipo receipt', 'BAD_REQUEST')
    }

    const units = channel.buildingId
      ? await this.unitsRepo.findByBuilding(channel.buildingId, { active: true })
      : await this.unitsRepo.findByCondominium(channel.condominiumId, { active: true })

    if (units.length === 0) return failure('No hay unidades activas', 'BAD_REQUEST')

    const totalAmount = parseAmount(input.amount)
    let created = 0

    for (const unit of units) {
      let unitAmount: number
      switch (channel.distributionMethod) {
        case 'by_aliquot':
          unitAmount = roundCurrency(totalAmount * (parseFloat(unit.aliquotPercentage ?? '0') / 100))
          break
        case 'equal_split':
          unitAmount = roundCurrency(totalAmount / units.length)
          break
        case 'fixed_per_unit':
          unitAmount = totalAmount
          break
        default:
          unitAmount = roundCurrency(totalAmount * (parseFloat(unit.aliquotPercentage ?? '0') / 100))
      }

      const result = await this.createChargeService.execute({
        billingChannelId: input.channelId,
        chargeTypeId: input.chargeTypeId,
        unitId: unit.id,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        description: input.description ?? `Cargo ${input.periodMonth}/${input.periodYear}`,
        amount: toDecimal(unitAmount),
        currencyId: channel.currencyId,
        entryDate: new Date().toISOString().split('T')[0]!,
        createdBy: input.createdBy ?? null,
      })

      if (result.success) created++
    }

    return success({ chargesCreated: created })
  }
}
