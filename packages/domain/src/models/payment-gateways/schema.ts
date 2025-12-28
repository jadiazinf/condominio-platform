import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const EGatewayTypes = ['stripe', 'banco_plaza', 'paypal', 'zelle', 'other'] as const

export const paymentGatewaySchema = baseModelSchema.extend({
  name: z.string().max(100),
  gatewayType: z.enum(EGatewayTypes),
  configuration: z.record(z.string(), z.unknown()).nullable(),
  supportedCurrencies: z.array(z.uuid()).nullable(),
  isActive: z.boolean().default(true),
  isSandbox: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid().nullable(),
})
