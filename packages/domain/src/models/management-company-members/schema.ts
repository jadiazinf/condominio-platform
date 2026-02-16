import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySchema } from '../management-companies/schema'
import { userSchema } from '../users/schema'

// Member role options
export const EMemberRole = ['admin', 'accountant', 'support', 'viewer'] as const

// Permission schema for members
export const memberPermissionsSchema = z.object({
  can_change_subscription: z.boolean().optional(),
  can_manage_members: z.boolean().optional(),
  can_create_tickets: z.boolean().optional(),
  can_view_invoices: z.boolean().optional(),
})

export const managementCompanyMemberSchema = baseModelSchema.extend({
  managementCompanyId: z.uuid(),
  userId: z.uuid(),

  // Roles: 'admin' (owner), 'accountant', 'support', 'viewer'
  // DEPRECATED: Use userRoleId → user_roles → roles for role lookup
  roleName: z.enum(EMemberRole),

  // Link to unified user_roles table
  userRoleId: z.uuid().nullable(),

  // Permisos específicos (JSONB para flexibilidad)
  permissions: memberPermissionsSchema.nullable(),

  isPrimaryAdmin: z.boolean().default(false),
  joinedAt: z.coerce.date().nullable(),
  invitedAt: z.coerce.date().nullable(),
  invitedBy: z.uuid().nullable(),
  isActive: z.boolean().default(true),
  deactivatedAt: z.coerce.date().nullable(),
  deactivatedBy: z.uuid().nullable(),

  // Relations
  managementCompany: managementCompanySchema.optional(),
  user: userSchema.optional(),
  invitedByUser: userSchema.optional(),
  deactivatedByUser: userSchema.optional(),
})
