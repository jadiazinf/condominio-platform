import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { paymentGatewaySchema } from '../payment-gateways/schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'

export const entityPaymentGatewaySchema = z.object({
  id: z.uuid(),
  paymentGatewayId: z.uuid(),
  condominiumId: z.uuid().nullable(),
  buildingId: z.uuid().nullable(),
  entityConfiguration: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean().default(true),
  registeredBy: z.uuid().nullable(),
  createdAt: timestampField,
  // Relations
  paymentGateway: paymentGatewaySchema.optional(),
  condominium: condominiumSchema.optional(),
  building: buildingSchema.optional(),
})
