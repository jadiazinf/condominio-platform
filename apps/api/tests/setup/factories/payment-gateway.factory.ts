import { faker } from '@faker-js/faker'
import type { TPaymentGatewayCreate } from '@packages/domain'

const GATEWAY_TYPES = ['stripe', 'paypal', 'banco_plaza', 'zelle', 'other'] as const

/**
 * Factory for creating payment gateway test data.
 */
export class PaymentGatewayFactory {
  /**
   * Creates fake data for a payment gateway.
   */
  static create(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return {
      name: `${faker.company.name()} Gateway`,
      gatewayType: faker.helpers.arrayElement(GATEWAY_TYPES),
      configuration: null,
      supportedCurrencies: null,
      isActive: true,
      isSandbox: true,
      metadata: null,
      registeredBy: null,
      ...overrides,
    }
  }

  /**
   * Creates fake data for a Stripe gateway.
   */
  static stripe(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return this.create({
      name: 'Stripe',
      gatewayType: 'stripe',
      configuration: {
        apiKey: 'sk_test_xxx',
        webhookSecret: 'whsec_xxx',
      },
      ...overrides,
    })
  }

  /**
   * Creates fake data for a PayPal gateway.
   */
  static paypal(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return this.create({
      name: 'PayPal',
      gatewayType: 'paypal',
      configuration: {
        clientId: 'client_xxx',
        clientSecret: 'secret_xxx',
      },
      ...overrides,
    })
  }

  /**
   * Creates fake data for a Zelle gateway.
   */
  static zelle(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return this.create({
      name: 'Zelle',
      gatewayType: 'zelle',
      ...overrides,
    })
  }

  /**
   * Creates fake data for a production gateway.
   */
  static production(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return this.create({
      isSandbox: false,
      ...overrides,
    })
  }

  /**
   * Creates fake data for an inactive gateway.
   */
  static inactive(overrides: Partial<TPaymentGatewayCreate> = {}): TPaymentGatewayCreate {
    return this.create({
      isActive: false,
      ...overrides,
    })
  }
}
