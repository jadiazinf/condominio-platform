import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

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

export const EPermissionActions = [
  'create',
  'read',
  'read_own',
  'update',
  'delete',
  'approve',
] as const

export const permissionSchema = baseModelSchema.extend({
  name: z.string().max(100),
  description: z.string().nullable(),
  module: z.enum(EPermissionModules),
  action: z.enum(EPermissionActions),
  registeredBy: z.uuid().nullable(),
})
