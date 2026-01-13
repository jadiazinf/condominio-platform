import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.permissions

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
  name: z.string({ error: d.name.required }).max(100, { error: d.name.max }),
  description: z.string().nullable(),
  module: z.enum(EPermissionModules, { error: d.module.invalid }),
  action: z.enum(EPermissionActions, { error: d.action.invalid }),
  registeredBy: z.uuid().nullable(),
})
