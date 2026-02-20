import { z } from 'zod'
import { EOwnershipTypes } from '../../unit-ownerships/schema'

export const accessRequestCreateSchema = z.object({
  accessCodeId: z.uuid(),
  unitId: z.uuid(),
  ownershipType: z.enum(EOwnershipTypes),
})

export const accessRequestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().optional(),
})

export const validateAccessCodeSchema = z.object({
  code: z.string().min(6).max(8),
})
