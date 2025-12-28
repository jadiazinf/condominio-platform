import { z } from 'zod'

// Reusable field schemas
export const timestampField = z.coerce.date()
export const dateField = z.iso.date()

export const baseModelSchema = z.object({
  id: z.uuid(),
  createdAt: timestampField,
  updatedAt: timestampField,
})
