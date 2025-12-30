import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { condominiumSchema } from '../condominiums/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.buildings

export const EBankAccountTypes = ['Corriente', 'Ahorro'] as const

export const buildingSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  name: z
    .string({ error: d.name.required })
    .max(255, { error: d.name.max }),
  code: z.string().max(50, { error: d.code.max }).nullable(),
  address: z.string().max(500, { error: d.address.max }).nullable(),
  floorsCount: z.number().int({ error: d.floorsCount.invalid }).nullable(),
  unitsCount: z.number().int({ error: d.unitsCount.invalid }).nullable(),
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
