import type { z } from 'zod'
import { condominiumReceiptCreateSchema } from './createDto'

export const condominiumReceiptUpdateSchema = condominiumReceiptCreateSchema.partial()

export type TCondominiumReceiptUpdate = z.infer<typeof condominiumReceiptUpdateSchema>
