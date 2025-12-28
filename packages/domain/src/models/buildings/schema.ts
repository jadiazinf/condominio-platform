import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { userSchema } from '../users/schema'

export const EBankAccountTypes = ['Corriente', 'Ahorro'] as const

export const buildingSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  name: z.string().max(255),
  code: z.string().max(50).nullable(),
  address: z.string().max(500).nullable(),
  floorsCount: z.number().int().nullable(),
  unitsCount: z.number().int().nullable(),
  bankAccountHolder: z.string().max(255).nullable(),
  bankName: z.string().max(100).nullable(),
  bankAccountNumber: z.string().max(100).nullable(),
  bankAccountType: z.enum(EBankAccountTypes).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  condominium: condominiumSchema.optional(),
  createdByUser: userSchema.optional(),
})
