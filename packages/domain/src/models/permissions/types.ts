import { z } from 'zod'
import {
  EPermissionModules,
  ESuperadminPermissionModules,
  EAllPermissionModules,
  EPermissionActions,
  permissionSchema,
} from './schema'

export type TPermissionModule = (typeof EPermissionModules)[number]
export type TSuperadminPermissionModule = (typeof ESuperadminPermissionModules)[number]
export type TAllPermissionModule = (typeof EAllPermissionModules)[number]
export type TPermissionAction = (typeof EPermissionActions)[number]

export type TPermission = z.infer<typeof permissionSchema>
