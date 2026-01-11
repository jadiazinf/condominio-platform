import { faker } from '@faker-js/faker'
import type { TEntityPaymentGatewayCreate } from '@packages/domain'

/**
 * Factory for creating entity payment gateway test data.
 */
export class EntityPaymentGatewayFactory {
  /**
   * Creates fake data for an entity payment gateway.
   */
  static create(overrides: Partial<TEntityPaymentGatewayCreate> = {}): TEntityPaymentGatewayCreate {
    return {
      paymentGatewayId: faker.string.uuid(),
      condominiumId: null,
      buildingId: null,
      isActive: true,
      entityConfiguration: null,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates a gateway for a condominium.
   */
  static forCondominium(
    paymentGatewayId: string,
    condominiumId: string,
    overrides: Partial<TEntityPaymentGatewayCreate> = {}
  ): TEntityPaymentGatewayCreate {
    return this.create({
      paymentGatewayId,
      condominiumId,
      buildingId: null,
      ...overrides,
    })
  }

  /**
   * Creates a gateway for a building.
   */
  static forBuilding(
    paymentGatewayId: string,
    buildingId: string,
    overrides: Partial<TEntityPaymentGatewayCreate> = {}
  ): TEntityPaymentGatewayCreate {
    return this.create({
      paymentGatewayId,
      buildingId,
      condominiumId: null,
      ...overrides,
    })
  }
}
