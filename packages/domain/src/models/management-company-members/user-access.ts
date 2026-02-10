import { z } from 'zod'
import { EMemberRole, memberPermissionsSchema } from './schema'

// Schema for a user's management company access
export const userManagementCompanyAccessSchema = z.object({
  memberId: z.uuid(),
  managementCompanyId: z.uuid(),
  managementCompanyName: z.string(),
  managementCompanyLogoUrl: z.string().nullable(),
  roleName: z.enum(EMemberRole),
  isPrimaryAdmin: z.boolean(),
  permissions: memberPermissionsSchema.nullable(),
})

export type TUserManagementCompanyAccess = z.infer<typeof userManagementCompanyAccessSchema>

// Response schema for /me/management-companies
export const userManagementCompaniesResponseSchema = z.object({
  managementCompanies: z.array(userManagementCompanyAccessSchema),
})

export type TUserManagementCompaniesResponse = z.infer<typeof userManagementCompaniesResponseSchema>

// Active role type for session management
export const EActiveRoleType = ['superadmin', 'management_company', 'condominium'] as const
export type TActiveRoleType = (typeof EActiveRoleType)[number]
