import { faker } from '@faker-js/faker'
import type { TQuotaAdjustmentCreate, TAdjustmentType } from '@packages/domain'

const ADJUSTMENT_TYPES: TAdjustmentType[] = ['discount', 'increase', 'correction', 'waiver']

/**
 * Factory for creating quota adjustment test data.
 */
export class QuotaAdjustmentFactory {
  /**
   * Creates fake data for a quota adjustment.
   */
  static create(overrides: Partial<TQuotaAdjustmentCreate> = {}): TQuotaAdjustmentCreate {
    const previousAmount = faker.number.float({ min: 50, max: 200, fractionDigits: 2 }).toFixed(2)
    const adjustmentType = faker.helpers.arrayElement(ADJUSTMENT_TYPES)
    let newAmount: string

    switch (adjustmentType) {
      case 'waiver':
        newAmount = '0.00'
        break
      case 'discount':
        newAmount = (parseFloat(previousAmount) * 0.9).toFixed(2)
        break
      case 'increase':
        newAmount = (parseFloat(previousAmount) * 1.1).toFixed(2)
        break
      default:
        newAmount = faker.number.float({ min: 50, max: 200, fractionDigits: 2 }).toFixed(2)
    }

    return {
      quotaId: faker.string.uuid(),
      previousAmount,
      newAmount,
      adjustmentType,
      reason: faker.lorem.sentence({ min: 3, max: 10 }),
      createdBy: faker.string.uuid(),
      ...overrides,
    }
  }

  /**
   * Creates a discount adjustment.
   */
  static discount(
    quotaId: string,
    createdBy: string,
    previousAmount: string,
    discountPercent: number = 10,
    overrides: Partial<TQuotaAdjustmentCreate> = {}
  ): TQuotaAdjustmentCreate {
    const newAmount = (parseFloat(previousAmount) * (1 - discountPercent / 100)).toFixed(2)
    return this.create({
      quotaId,
      previousAmount,
      newAmount,
      adjustmentType: 'discount',
      reason: `Descuento del ${discountPercent}%`,
      createdBy,
      ...overrides,
    })
  }

  /**
   * Creates an increase adjustment.
   */
  static increase(
    quotaId: string,
    createdBy: string,
    previousAmount: string,
    increasePercent: number = 10,
    overrides: Partial<TQuotaAdjustmentCreate> = {}
  ): TQuotaAdjustmentCreate {
    const newAmount = (parseFloat(previousAmount) * (1 + increasePercent / 100)).toFixed(2)
    return this.create({
      quotaId,
      previousAmount,
      newAmount,
      adjustmentType: 'increase',
      reason: `Incremento del ${increasePercent}%`,
      createdBy,
      ...overrides,
    })
  }

  /**
   * Creates a correction adjustment.
   */
  static correction(
    quotaId: string,
    createdBy: string,
    previousAmount: string,
    newAmount: string,
    overrides: Partial<TQuotaAdjustmentCreate> = {}
  ): TQuotaAdjustmentCreate {
    return this.create({
      quotaId,
      previousAmount,
      newAmount,
      adjustmentType: 'correction',
      reason: 'Corrección de error en monto',
      createdBy,
      ...overrides,
    })
  }

  /**
   * Creates a waiver adjustment (sets amount to 0).
   */
  static waiver(
    quotaId: string,
    createdBy: string,
    previousAmount: string,
    overrides: Partial<TQuotaAdjustmentCreate> = {}
  ): TQuotaAdjustmentCreate {
    return this.create({
      quotaId,
      previousAmount,
      newAmount: '0.00',
      adjustmentType: 'waiver',
      reason: 'Condonación de deuda',
      createdBy,
      ...overrides,
    })
  }
}
