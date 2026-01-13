import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySchema } from '../management-companies/schema'
import { locationSchema } from '../locations/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.condominiums

export const condominiumSchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  code: z.string().max(50, { error: d.code.max }).nullable(),
  managementCompanyId: z.uuid({ error: d.managementCompanyId.invalid }).nullable(),
  address: z.string().max(500, { error: d.address.max }).nullable(),
  locationId: z.uuid({ error: d.locationId.invalid }).nullable(),
  email: z.email({ error: d.email.invalid }).max(255, { error: d.email.max }).nullable(),
  phone: z.string().max(50, { error: d.phone.max }).nullable(),
  defaultCurrencyId: z.uuid({ error: d.defaultCurrencyId.invalid }).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  managementCompany: managementCompanySchema.optional(),
  location: locationSchema.optional(),
  defaultCurrency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
})
