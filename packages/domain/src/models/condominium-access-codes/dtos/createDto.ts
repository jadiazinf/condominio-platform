import { z } from 'zod'
import { EAccessCodeValidity } from '../schema'

export const condominiumAccessCodeCreateSchema = z.object({
  condominiumId: z.uuid(),
  validity: z.enum(EAccessCodeValidity),
  createdBy: z.uuid().nullable(),
})
