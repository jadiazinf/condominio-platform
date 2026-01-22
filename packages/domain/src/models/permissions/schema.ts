import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.permissions

// Regular user permission modules (condominium-scoped)
export const EPermissionModules = [
  'condominiums',
  'buildings',
  'units',
  'payments',
  'quotas',
  'expenses',
  'users',
  'documents',
] as const

// Superadmin-specific permission modules (platform-wide)
export const ESuperadminPermissionModules = [
  'platform_users',
  'platform_condominiums',
  'platform_management_companies',
  'platform_payments',
  'platform_audit_logs',
  'platform_settings',
  'platform_metrics',
  'platform_superadmins',
] as const

// Combined modules for the database schema
export const EAllPermissionModules = [
  ...EPermissionModules,
  ...ESuperadminPermissionModules,
] as const

export const EPermissionActions = [
  'create',
  'read',
  'read_own',
  'update',
  'delete',
  'approve',
  'manage',
  'export',
] as const

export const permissionSchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(100, { error: d.name.max }),
  description: z.string().nullable(),
  module: z.enum(EAllPermissionModules, { error: d.module.invalid }),
  action: z.enum(EPermissionActions, { error: d.action.invalid }),
  registeredBy: z.uuid().nullable(),
})
