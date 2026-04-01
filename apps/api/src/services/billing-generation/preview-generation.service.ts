import type { TBillingChannel, TChargeType } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'

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

type TChargeTypesRepo = {
  listByChannel: (channelId: string) => Promise<TChargeType[]>
}

export interface IPreviewInput {
  channelId: string
  chargeAmounts: Array<{ chargeTypeId: string; amount: string }>
}

export interface IUnitChargePreview {
  chargeTypeName: string
  chargeTypeId: string
  category: string
  amount: string
}

export interface IUnitPreview {
  unitId: string
  unitNumber: string
  aliquotPercentage: string
  charges: IUnitChargePreview[]
  total: string
}

export interface IPreviewOutput {
  unitPreviews: IUnitPreview[]
  grandTotal: string
  aliquotSum: string
}

export class PreviewGenerationService {
  constructor(
    private billingChannelsRepo: TBillingChannelsRepo,
    private unitsRepo: TUnitsRepo,
    private chargeTypesRepo: TChargeTypesRepo,
  ) {}

  async execute(input: IPreviewInput): Promise<TServiceResult<IPreviewOutput>> {
    const channel = await this.billingChannelsRepo.getById(input.channelId)
    if (!channel) return failure('Canal no encontrado', 'NOT_FOUND')
    if (!channel.isActive) return failure('Canal inactivo', 'BAD_REQUEST')

    const units = channel.buildingId
      ? await this.unitsRepo.findByBuilding(channel.buildingId, { active: true })
      : await this.unitsRepo.findByCondominium(channel.condominiumId, { active: true })

    const chargeTypes = await this.chargeTypesRepo.listByChannel(input.channelId)
    const ctMap = new Map(chargeTypes.map(ct => [ct.id, ct]))

    let grandTotal = 0
    let aliquotSum = 0
    const unitPreviews: IUnitPreview[] = []

    for (const unit of units) {
      const aliquot = parseFloat(unit.aliquotPercentage ?? '0')
      aliquotSum += aliquot
      let unitTotal = 0
      const charges: IUnitChargePreview[] = []

      for (const ca of input.chargeAmounts) {
        const ct = ctMap.get(ca.chargeTypeId)
        if (!ct) continue

        const total = parseAmount(ca.amount)
        let unitAmount: number

        switch (channel.distributionMethod) {
          case 'by_aliquot':
            unitAmount = roundCurrency(total * (aliquot / 100))
            break
          case 'equal_split':
            unitAmount = roundCurrency(total / units.length)
            break
          case 'fixed_per_unit':
            unitAmount = total
            break
          default:
            unitAmount = roundCurrency(total * (aliquot / 100))
        }

        charges.push({
          chargeTypeName: ct.name,
          chargeTypeId: ct.id,
          category: ct.category,
          amount: toDecimal(unitAmount),
        })
        unitTotal += unitAmount
      }

      unitPreviews.push({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        aliquotPercentage: unit.aliquotPercentage ?? '0',
        charges,
        total: toDecimal(unitTotal),
      })
      grandTotal += unitTotal
    }

    return success({
      unitPreviews,
      grandTotal: toDecimal(grandTotal),
      aliquotSum: toDecimal(aliquotSum),
    })
  }
}
