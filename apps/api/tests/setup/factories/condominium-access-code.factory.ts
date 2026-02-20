import { faker } from '@faker-js/faker'
import type { TCondominiumAccessCodeCreate } from '@packages/domain'

export class CondominiumAccessCodeFactory {
  static create(overrides: Partial<TCondominiumAccessCodeCreate> = {}): TCondominiumAccessCodeCreate {
    return {
      condominiumId: faker.string.uuid(),
      validity: '7_days',
      createdBy: faker.string.uuid(),
      ...overrides,
    }
  }

  static withValidity(
    condominiumId: string,
    validity: '1_day' | '7_days' | '1_month' | '1_year',
    createdBy: string,
    overrides: Partial<TCondominiumAccessCodeCreate> = {}
  ): TCondominiumAccessCodeCreate {
    return this.create({
      condominiumId,
      validity,
      createdBy,
      ...overrides,
    })
  }
}
