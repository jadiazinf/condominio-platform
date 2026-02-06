import { z } from 'zod'

/**
 * Pagination metadata returned from the API
 */
export type TPaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Paginated response structure
 */
export type TPaginatedResponse<T> = {
  data: T[]
  pagination: TPaginationMeta
}

/**
 * Query parameters for paginated requests
 */
export type TPaginationQuery = {
  page?: number
  limit?: number
}

/**
 * Zod schema for pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type TPaginationQuerySchema = z.infer<typeof paginationQuerySchema>

/**
 * Query parameters for management companies list with filters
 */
export type TManagementCompaniesQuery = TPaginationQuery & {
  search?: string
  isActive?: boolean
}

/**
 * Zod schema for management companies query parameters
 */
export const managementCompaniesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined
      return val === 'true'
    }),
})

export type TManagementCompaniesQuerySchema = z.infer<typeof managementCompaniesQuerySchema>

/**
 * Query parameters for condominiums list with filters
 */
export type TCondominiumsQuery = TPaginationQuery & {
  search?: string
  isActive?: boolean
  locationId?: string
}

/**
 * Zod schema for condominiums query parameters
 */
export const condominiumsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined
      return val === 'true'
    }),
  locationId: z.string().optional(),
})

export type TCondominiumsQuerySchema = z.infer<typeof condominiumsQuerySchema>

/**
 * Query parameters for management company members list with filters
 */
export type TManagementCompanyMembersQuery = TPaginationQuery & {
  search?: string
  roleName?: string
  isActive?: boolean
}

/**
 * Zod schema for management company members query parameters
 */
export const managementCompanyMembersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  roleName: z.enum(['admin', 'accountant', 'support', 'viewer']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined
      return val === 'true'
    }),
})

export type TManagementCompanyMembersQuerySchema = z.infer<typeof managementCompanyMembersQuerySchema>
