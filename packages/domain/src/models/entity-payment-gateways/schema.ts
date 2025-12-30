import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { paymentGatewaySchema } from '../payment-gateways/schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.entityPaymentGateways

export const entityPaymentGatewaySchema = z.object({
  id: z.uuid(),
  paymentGatewayId: z.uuid({ error: d.paymentGatewayId.invalid }),
  condominiumId: z.uuid({ error: d.condominiumId.invalid }).nullable(),
  buildingId: z.uuid({ error: d.buildingId.invalid }).nullable(),
  entityConfiguration: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean().default(true),
  registeredBy: z.uuid({ error: d.registeredBy.invalid }).nullable(),
  createdAt: timestampField,
  // Relations
  paymentGateway: paymentGatewaySchema.optional(),
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
})
