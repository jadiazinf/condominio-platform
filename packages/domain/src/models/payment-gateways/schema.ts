import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.paymentGateways

export const EGatewayTypes = ['stripe', 'banco_plaza', 'paypal', 'zelle', 'other'] as const

export const paymentGatewaySchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(100, { error: d.name.max }),
  gatewayType: z.enum(EGatewayTypes, { error: d.gatewayType.invalid }),
  configuration: z.record(z.string(), z.unknown()).nullable(),
  supportedCurrencies: z.array(z.uuid()).nullable(),
  isActive: z.boolean().default(true),
  isSandbox: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
})
