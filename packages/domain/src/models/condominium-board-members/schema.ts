import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const EBoardPositions = [
  'president',
  'secretary',
  'treasurer',
  'substitute_president',
  'substitute_secretary',
  'substitute_treasurer',
] as const

export const EBoardMemberStatuses = ['active', 'inactive', 'replaced'] as const

export const condominiumBoardMemberSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  userId: z.uuid(),
  position: z.enum(EBoardPositions),
  status: z.enum(EBoardMemberStatuses).default('active'),
  electedAt: z.string(),
  termEndsAt: z.string().nullable(),
  assemblyMinuteId: z.uuid().nullable(),
  notes: z.string().nullable(),
  createdBy: z.uuid().nullable(),
})

export const condominiumBoardMemberCreateSchema = condominiumBoardMemberSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const condominiumBoardMemberUpdateSchema = condominiumBoardMemberCreateSchema.partial()
