import type { TChargeType, TChargeCategory } from '@packages/domain'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'

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
  listByCondominium: (condominiumId: string) => Promise<TChargeType[]>
}

type TChargeCategoriesRepo = {
  listAllActive: () => Promise<TChargeCategory[]>
}

export interface IPreviewMonthlyBillingInput {
  condominiumId: string
  buildingId?: string | null
  distributionMethod: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
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

export interface IPreviewMonthlyBillingOutput {
  unitPreviews: IUnitPreview[]
  grandTotal: string
  aliquotSum: string
}

export class PreviewMonthlyBillingService {
  constructor(
    private unitsRepo: TUnitsRepo,
    private chargeTypesRepo: TChargeTypesRepo,
    private chargeCategoriesRepo?: TChargeCategoriesRepo,
  ) {}

  async execute(input: IPreviewMonthlyBillingInput): Promise<TServiceResult<IPreviewMonthlyBillingOutput>> {
    const { condominiumId, buildingId, distributionMethod } = input

    const units = buildingId
      ? await this.unitsRepo.findByBuilding(buildingId, { active: true })
      : await this.unitsRepo.findByCondominium(condominiumId, { active: true })

    const chargeTypes = await this.chargeTypesRepo.listByCondominium(condominiumId)
    const ctMap = new Map(chargeTypes.map(ct => [ct.id, ct]))

    // Build category ID → name lookup
    const categories = this.chargeCategoriesRepo ? await this.chargeCategoriesRepo.listAllActive() : []
    const catNameMap = new Map(categories.map(c => [c.id, c.name]))

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

        switch (distributionMethod) {
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
          category: catNameMap.get(ct.categoryId) ?? '',
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
