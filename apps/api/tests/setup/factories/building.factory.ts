import { faker } from '@faker-js/faker'
import type { TBuildingCreate } from '@packages/domain'

const BANK_ACCOUNT_TYPES = ['Corriente', 'Ahorro'] as const

/**
 * Factory for creating building test data.
 */
export class BuildingFactory {
  /**
   * Creates fake data for a building.
   */
  static create(condominiumId: string, overrides: Partial<TBuildingCreate> = {}): TBuildingCreate {
    return {
      condominiumId,
      name: `Torre ${faker.string.alpha({ length: 1, casing: 'upper' })}`,
      code: faker.string.alphanumeric(4).toUpperCase(),
      address: faker.location.streetAddress(),
      floorsCount: faker.number.int({ min: 5, max: 30 }),
      unitsCount: faker.number.int({ min: 20, max: 200 }),
      bankAccountHolder: faker.company.name(),
      bankName: `${faker.company.name()} Bank`,
      bankAccountNumber: faker.finance.accountNumber(),
      bankAccountType: faker.helpers.arrayElement(BANK_ACCOUNT_TYPES),
      isActive: true,
      metadata: null,
      createdBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data with bank account info.
   */
  static withBankAccount(
    condominiumId: string,
    bankInfo: {
      holder?: string
      bankName?: string
      accountNumber?: string
      accountType?: (typeof BANK_ACCOUNT_TYPES)[number]
    },
    overrides: Partial<TBuildingCreate> = {}
  ): TBuildingCreate {
    return this.create(condominiumId, {
      bankAccountHolder: bankInfo.holder ?? faker.company.name(),
      bankName: bankInfo.bankName ?? `${faker.company.name()} Bank`,
      bankAccountNumber: bankInfo.accountNumber ?? faker.finance.accountNumber(),
      bankAccountType: bankInfo.accountType ?? 'Corriente',
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive building.
   */
  static inactive(
    condominiumId: string,
    overrides: Partial<TBuildingCreate> = {}
  ): TBuildingCreate {
    return this.create(condominiumId, {
      isActive: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a small building.
   */
  static small(condominiumId: string, overrides: Partial<TBuildingCreate> = {}): TBuildingCreate {
    return this.create(condominiumId, {
      floorsCount: 3,
      unitsCount: 12,
      ...overrides,
    })
  }

  /**
   * Creates fake data for a large building.
   */
  static large(condominiumId: string, overrides: Partial<TBuildingCreate> = {}): TBuildingCreate {
    return this.create(condominiumId, {
      floorsCount: 30,
      unitsCount: 240,
      ...overrides,
    })
  }
}
