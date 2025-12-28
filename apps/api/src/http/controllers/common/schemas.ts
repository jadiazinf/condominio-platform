import { z } from 'zod'

/**
 * Common schema for UUID path parameters.
 */
export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

/**
 * Common schema for code path parameters.
 */
export const CodeParamSchema = z.object({
  code: z.string().min(1),
})

export type TIdParam = z.infer<typeof IdParamSchema>
export type TCodeParam = z.infer<typeof CodeParamSchema>
