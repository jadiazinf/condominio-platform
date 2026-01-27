import { z } from 'zod'
import { managementCompanyMemberSchema, EMemberRole, memberPermissionsSchema } from './schema'

export type TMemberRole = (typeof EMemberRole)[number]
export type TMemberPermissions = z.infer<typeof memberPermissionsSchema>
export type TManagementCompanyMember = z.infer<typeof managementCompanyMemberSchema>
