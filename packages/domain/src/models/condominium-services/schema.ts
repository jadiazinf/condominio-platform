import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.condominiumServices

export const EServiceProviderTypes = [
  'individual',
  'company',
  'cooperative',
  'government',
  'internal',
] as const

export const condominiumServiceSchema = baseModelSchema.extend({
  condominiumId: z.uuid({ error: d.condominiumId.invalid }),
  name: z.string({ error: d.name.required }).max(255, { error: d.name.max }),
  description: z.string().nullable(),
  providerType: z.enum(EServiceProviderTypes, { error: d.providerType.invalid }),
  legalName: z.string().max(255).nullable(),
  taxIdType: z.string().max(5).nullable(),
  taxIdNumber: z.string().max(50).nullable(),
  email: z.string().email({ error: d.email.invalid }).max(255).nullable(),
  phoneCountryCode: z.string().max(10).nullable(),
  phone: z.string().max(50).nullable(),
  address: z.string().max(500).nullable(),
  locationId: z.uuid().nullable(),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  defaultAmount: z.number().min(0).nullable(),
  chargesIva: z.boolean().default(false),
  ivaRate: z.number().min(0).max(1).default(0.16),
  subjectToIslarRetention: z.boolean().default(false),
  islrRetentionRate: z.number().min(0).max(1).default(0.01),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid({ error: d.createdBy.invalid }).nullable(),
})

export const condominiumServiceCreateSchema = z.object({
  name: z.string({ error: d.name.required }).min(1).max(255, { error: d.name.max }),
  description: z.string().max(1000).optional(),
  providerType: z.enum(EServiceProviderTypes, { error: d.providerType.invalid }),
  legalName: z.string().max(255).optional(),
  taxIdType: z.string().max(5).optional(),
  taxIdNumber: z.string().max(50).optional(),
  email: z.string().email({ error: d.email.invalid }).max(255).optional(),
  phoneCountryCode: z.string().max(10).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  locationId: z.string().uuid().optional(),
  currencyId: z.string().uuid({ error: d.currencyId.invalid }),
  defaultAmount: z.number().min(0).optional(),
  chargesIva: z.boolean().default(false),
  ivaRate: z.number().min(0).max(1).default(0.16),
  subjectToIslarRetention: z.boolean().default(false),
  islrRetentionRate: z.number().min(0).max(1).default(0.01),
  condominiumId: z.string().uuid({ error: d.condominiumId.invalid }),
})

export const condominiumServiceUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  providerType: z.enum(EServiceProviderTypes).optional(),
  legalName: z.string().max(255).nullable().optional(),
  taxIdType: z.string().max(5).nullable().optional(),
  taxIdNumber: z.string().max(50).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phoneCountryCode: z.string().max(10).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  currencyId: z.string().uuid().optional(),
  defaultAmount: z.number().min(0).nullable().optional(),
  chargesIva: z.boolean().optional(),
  ivaRate: z.number().min(0).max(1).optional(),
  subjectToIslarRetention: z.boolean().optional(),
  islrRetentionRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
})
