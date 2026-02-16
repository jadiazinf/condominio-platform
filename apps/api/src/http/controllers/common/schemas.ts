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

/**
 * Common schema for managementCompanyId path parameters.
 */
export const ManagementCompanyIdParamSchema = z.object({
  managementCompanyId: z.string().uuid('Invalid managementCompanyId format'),
})

export type TIdParam = z.infer<typeof IdParamSchema>
export type TCodeParam = z.infer<typeof CodeParamSchema>
export type TManagementCompanyIdParam = z.infer<typeof ManagementCompanyIdParamSchema>
