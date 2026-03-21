import type { TGatewayType } from '@packages/domain'
import type { IPaymentGatewayAdapter } from './adapters/types'
import { ManualPaymentAdapter } from './adapters/manual.adapter'
import { BankPaymentAdapter } from './adapters/bank.adapter'
import { StripePaymentAdapter } from './adapters/stripe.adapter'
import { BncPaymentAdapter } from './adapters/bnc.adapter'
import { env } from '@config/environment'

/**
 * Factory/registry that resolves the correct adapter for a given gateway type.
 *
 * To add a new gateway:
 * 1. Create an adapter class implementing IPaymentGatewayAdapter
 * 2. Call manager.register(new YourAdapter())
 *
 * Multiple gateway types can map to the same adapter (e.g. 'zelle' and 'paypal'
 * both use ManualPaymentAdapter since they don't have direct API integrations).
 */
export class PaymentGatewayManager {
  private readonly adapters: Map<string, IPaymentGatewayAdapter>

  constructor() {
    this.adapters = new Map()

    // Register built-in adapters
    const manual = new ManualPaymentAdapter()
    const bank = new BankPaymentAdapter()
    const stripe = new StripePaymentAdapter()

    // BNC adapter — initialized only when env vars are present
    const bncConfig =
      env.BNC_API_BASE_URL && env.BNC_CLIENT_GUID && env.BNC_MASTER_KEY && env.BNC_TERMINAL
        ? {
            baseUrl: env.BNC_API_BASE_URL,
            clientGUID: env.BNC_CLIENT_GUID,
            masterKey: env.BNC_MASTER_KEY,
            terminal: env.BNC_TERMINAL,
            sandbox: env.BNC_SANDBOX,
          }
        : undefined
    const bnc = new BncPaymentAdapter(bncConfig, env.BNC_WEBHOOK_API_KEY)

    // Map gateway types to adapters
    this.register(manual) // 'other'
    this.adapters.set('zelle', manual) // Zelle → manual (no API)
    this.adapters.set('paypal', manual) // PayPal → manual (no API yet)
    this.register(bank) // 'banco_plaza'
    this.register(stripe) // 'stripe'
    this.register(bnc) // 'bnc'
  }

  /**
   * Register an adapter. Uses adapter.gatewayType as key.
   */
  register(adapter: IPaymentGatewayAdapter): void {
    this.adapters.set(adapter.gatewayType, adapter)
  }

  /**
   * Resolve the adapter for a given gateway type.
   * Throws if no adapter is registered.
   */
  getAdapter(gatewayType: TGatewayType): IPaymentGatewayAdapter {
    const adapter = this.adapters.get(gatewayType)
    if (!adapter) {
      throw new Error(`No adapter registered for gateway type: ${gatewayType}`)
    }
    return adapter
  }

  /**
   * Check if an adapter is registered for a given gateway type.
   */
  hasAdapter(gatewayType: TGatewayType): boolean {
    return this.adapters.has(gatewayType)
  }
}
