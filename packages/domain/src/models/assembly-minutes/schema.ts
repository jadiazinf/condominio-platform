import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const EAssemblyTypes = ['ordinary', 'extraordinary'] as const

export const EAssemblyMinuteStatuses = ['draft', 'approved', 'voided'] as const

export const assemblyMinuteSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  title: z.string(),
  assemblyType: z.enum(EAssemblyTypes),
  assemblyDate: z.string(),
  assemblyLocation: z.string().nullable(),
  quorumPercentage: z.string().nullable(),
  attendeesCount: z.number().int().nullable(),
  totalUnits: z.number().int().nullable(),
  agenda: z.string().nullable(),
  decisions: z.record(z.string(), z.unknown()).nullable(),
  notes: z.string().nullable(),
  documentUrl: z.string().nullable(),
  documentFileName: z.string().nullable(),
  status: z.enum(EAssemblyMinuteStatuses).default('draft'),
  isActive: z.boolean().default(true),
  createdBy: z.uuid().nullable(),
})

export const assemblyMinuteCreateSchema = assemblyMinuteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const assemblyMinuteUpdateSchema = assemblyMinuteCreateSchema.partial()
