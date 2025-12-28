import { z } from 'zod'
import { EPermissionModules, EPermissionActions, permissionSchema } from './schema'

export type TPermissionModule = (typeof EPermissionModules)[number]
export type TPermissionAction = (typeof EPermissionActions)[number]

export type TPermission = z.infer<typeof permissionSchema>
